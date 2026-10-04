import { telaMarcha, regiaoDe, navegacaoRegional, heroApuracao, escopoDoPainel, blocoVotos, cardCargo, cardBancada, REGIOES } from "./marcha.js";
import { agregarResultados } from "./agregado.js";
import { lerRota, montarRota } from "./rota.js";
import { tiraEstados, barraEstado, folhaEstados, filtrarEstados } from "./seletor.js";
import { abrirFicha, iniciarFicha } from "./candidato.js";
import { CONFIG, CARGOS, ABAS, UFS } from "./config.js";
import {
  urlsResultado, urlMunicipios, urlAcompanhamento, urlHistorico, urlResultadosPresidente, urlFoto,
  buscarJson, buscarPrimeiro, normalizar, lerMunicipios, lerAcompanhamento,
} from "./tse.js";
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { corPartido } from "./cores.js";
import { linhaEvolucao, linhasResultado } from "./graficos.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const pct = (n, c = 2) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (d) => d.toLocaleTimeString("pt-BR");
const nomeUF = (uf) => (uf === "BR" ? "Brasil" : uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

const estado = { aba: "andamento", uf: "BR", cargo: "resumo", mun: "", municipios: {}, mostrar: 50, view: null, serie: "f", regiao: "", ordem: "az" };
const memo = { historico: { t: 0, dados: [] }, ultima: null, proxima: 0, erro: "", carregando: false, pendente: false };

// ---------- navegação (guardada na URL: #/estados/SP/governador/71072) ----------
const guardarUf = (uf) => { try { localStorage.setItem("uf-estados", uf); } catch { /* sem armazenamento */ } };
const ufGuardada = () => { try { const u = localStorage.getItem("uf-estados"); return UFS[u] ? u : ""; } catch { return ""; } };
estado.ufPadrao = ufGuardada() || "SP";
const cargoAtivo = () => (estado.aba === "estados" ? estado.cargo : estado.aba);

function lerHash() {
  Object.assign(estado, lerRota(location.hash, { ufs: UFS, ufPadrao: estado.ufPadrao }));
  if (estado.uf !== "BR" && estado.uf !== "ZZ") estado.regiao = regiaoDe(estado.uf); // a região acompanha o estado da URL
  if (estado.aba === "estados" && location.hash.split("/")[2]) guardarUf(estado.uf); // só guarda o que a pessoa escolheu, não o padrão
}
const gravarHash = () => history.replaceState(null, "", montarRota(estado));
const permiteMun = () => (estado.aba === "presidente" || (estado.aba === "estados" && ["governador", "senador", "presidente"].includes(estado.cargo))) && estado.uf !== "BR" && estado.uf !== "ZZ";

function montarControles() {
  $("abas").innerHTML = ABAS.map((a) => `<button data-aba="${a.id}" aria-current="${a.id === estado.aba}">${a.nome}</button>`).join("");
  document.querySelector(".filtros").hidden = !permiteMun(); // estado e região são escolhidos na navegação do topo; sobra só o município
  $("lbl-mun").hidden = !permiteMun();
  const lista = estado.municipios[estado.uf] || [];
  $("mun").innerHTML = `<option value="">Todo o estado</option>` + lista.map((m) => `<option value="${m.cod}">${esc(m.nome)}</option>`).join("");
  $("mun").value = estado.mun;
}

function navegar(mudanca) {
  Object.assign(estado, mudanca);
  if (estado.aba === "estados" && (estado.uf === "BR" || estado.uf === "ZZ")) estado.uf = estado.ufPadrao;
  if (estado.aba === "camara") estado.uf = "BR";
  if (estado.uf === "ZZ" && estado.aba !== "presidente" && estado.aba !== "andamento") estado.uf = "BR";
  if (mudanca.aba || mudanca.uf || mudanca.cargo) estado.mun = mudanca.mun ?? "";
  if (estado.aba === "estados") { guardarUf(estado.uf); estado.ufPadrao = estado.uf; }
  estado.mostrar = 50;
  if (estado.view?.tipo === "presidente" && estado.aba === "presidente") render(); // tudo o que o painel precisa já está carregado
  if (estado.aba === "andamento" && estado.view?.tipo === "andamento") { estado.view = { ...estado.view, detalhe: {} }; render(); } // o painel já tem os dados: mostra na hora, os líderes chegam depois
  if (estado.aba === "estados" && estado.view?.tipo === "estados") { renderNavegacao(estado.view); $("conteudo").innerHTML = `<section class="card"><p class="muted">Carregando ${esc(UFS[estado.uf])}…</p></section>`; }
  gravarHash(); montarControles(); atualizar();
}

// ---------- dados ----------
async function obter(cargo, uf, mun) {
  const { json } = await buscarPrimeiro(urlsResultado(cargo, uf, mun));
  return normalizar(json);
}
const obterAcompanhamento = async (cargo) => lerAcompanhamento(await buscarJson(urlAcompanhamento(cargo)));

const memoRP = { t: 0, dados: null };
async function obterResultadosPresidente() {
  if (Date.now() - memoRP.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return memoRP.dados;
  try { memoRP.dados = await buscarJson(urlResultadosPresidente()); } catch { /* segue sem o gráfico */ }
  memoRP.t = Date.now();
  return memoRP.dados;
}

async function obterHistorico() {
  if (Date.now() - memo.historico.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return memo.historico.dados;
  try { memo.historico = { t: Date.now(), dados: (await buscarJson(urlHistorico())).pontos ?? [] }; } catch { memo.historico.t = Date.now(); }
  return memo.historico.dados;
}

// Dados pesados (27 estados) são buscados em segundo plano: a tela mostra o principal
// primeiro e se completa quando eles chegam. Devolve o último valor conhecido (ou null).
const segundoPlano = {};
function emSegundoPlano(chave, ttlMs, produtor) {
  const e = (segundoPlano[chave] ??= { t: 0, dados: null, emVoo: false });
  if (!e.emVoo && Date.now() - e.t >= ttlMs) {
    e.emVoo = true;
    produtor().then((d) => { e.dados = d; e.t = Date.now(); }).catch(() => { e.t = Date.now(); })
      .finally(() => { e.emVoo = false; atualizar(); });
  }
  return e.dados;
}

async function panorama(cargo) {
  const ufs = [...Object.keys(UFS), ...(cargo === "presidente" ? ["ZZ"] : [])];
  const rs = await Promise.allSettled(ufs.map((uf) => obter(cargo, uf)));
  return ufs.map((uf, i) => ({ uf, d: rs[i].status === "fulfilled" ? rs[i].value : null }));
}

async function estadosDepFederal() {
  const lista = (await panorama("dep-federal")).filter((x) => x.d);
  return lista.map(({ uf, d }) => ({ uf, d, dist: distribuirEstado(d) }));
}

async function detalhesEstado(uf, comDeputados = false) {
  const talvez = (cargo) => obter(cargo, uf).catch(() => null);
  const bancada = async (cargo) => { const d = await talvez(cargo); return d ? { d, dist: distribuirEstado(d) } : null; };
  const [pres, gov, sen, depf, depe] = await Promise.all([talvez("presidente"), uf === "ZZ" ? null : talvez("governador"), uf === "ZZ" ? null : talvez("senador"),
    comDeputados ? bancada("dep-federal") : null, comDeputados ? bancada("dep-estadual") : null]);
  return { pres, gov, sen, depf, depe };
}

async function carregarView() {
  const { aba, uf, mun } = estado;
  const hist = obterHistorico();
  if (aba === "andamento") {
    const [f, e, h] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador"), hist]);
    // Resumo do estado aberto na lista: busca em segundo plano, sem travar o painel principal.
    const detalhe = uf === "BR" ? {} : emSegundoPlano("det-" + uf, 9000, () => detalhesEstado(uf)) ?? {};
    return { tipo: "andamento", f, e, h, detalhe };
  }
  if (aba === "estados") {
    const { cargo } = estado;
    const [f, e] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador")]);
    const base = { tipo: "estados", uf, cargo, f, e };
    if (cargo === "resumo") return { ...base, detalhe: emSegundoPlano("detx-" + uf, 9000, () => detalhesEstado(uf, true)) ?? {} };
    if (CARGOS[cargo].proporcional) { const d = await obter(cargo, uf); return { ...base, d, dist: distribuirEstado(d) }; }
    const [d, rp] = await Promise.all([obter(cargo, uf, mun), cargo === "presidente" ? obterResultadosPresidente() : null]);
    return { ...base, d, rp };
  }
  const acomp = obterAcompanhamento(aba === "camara" ? "dep-federal" : aba);
  if (aba === "presidente") {
    // Os 28 locais (27 estados e exterior) vêm em segundo plano: alimentam as regiões e a lista de estados.
    const lista = emSegundoPlano("pan-presidente", CONFIG.atualizarACadaSegundos * 900, () => panorama("presidente"));
    const [d, du, ac, rp, h] = await Promise.all([obter("presidente", "BR"), uf === "BR" ? null : obter("presidente", uf, mun), acomp, obterResultadosPresidente(), hist]);
    return { tipo: "presidente", d, du, duChave: `${uf}/${mun}`, lista, ac, rp, h };
  }
  // Câmara dos Deputados: os 513 deputados somados dos 27 estados.
  const estados = emSegundoPlano("nacional", CONFIG.atualizarNacionalACadaSegundos * 1000, estadosDepFederal);
  const [ac, h] = await Promise.all([acomp, hist]);
  return { tipo: "nacional-prop", nacional: estados ? consolidarNacional(estados) : null, ac, h };
}

// ---------- peças de tela ----------
const TEXTO_ANDAMENTO = { n: "Apuração não iniciada", p: "Apuração em andamento", f: "Totalização finalizada" };
const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_ANDAMENTO[a] ?? ""}</span>`;
const chaveUF = (uf) => (uf === "BR" ? "br" : uf.toLowerCase());

function aviso(texto) { return texto ? `<p class="aviso">${esc(texto)}</p>` : ""; }

function avisosApuracao(d) {
  return [
    !d.divulgaVotos && "O TSE ainda não liberou a divulgação da votação deste cargo. Os votos aparecem zerados por regra do TSE.",
    d.definido === "e" && "Eleição matematicamente definida: o candidato mais votado está eleito.",
    d.definido === "s" && "Matematicamente definido: a disputa vai para o 2º turno.",
    d.semEleito && "O TSE não atribuiu eleitos neste cargo." + (d.motivosSemEleito.length ? " Motivo: " + d.motivosSemEleito.join("; ") : ""),
  ].filter(Boolean).map(aviso).join("");
}

function blocoProgresso(titulo, d, ac) {
  const p = ac ?? {};
  const pc = d ? d.pctSecoes : p.pct ?? 0;
  const apur = d ? d.secoesApuradas : p.st ?? 0, total = d ? d.secoesTotal : p.ts ?? 0;
  const and = d ? d.andamento : p.andamento;
  const quando = d?.atualizadoEm || [p.dt, p.ht].filter(Boolean).join(" ");
  const estat = d
    ? `<div class="estat">
        <div><span>Votos válidos</span><strong>${fmt(d.votosValidos)}</strong></div>
        <div><span>Brancos</span><strong>${fmt(d.brancos)}</strong></div>
        <div><span>Nulos</span><strong>${fmt(d.nulos)}</strong></div>
        <div><span>Comparecimento</span><strong>${fmt(d.comparecimento)} <small class="muted">${pct(d.pctComparecimento)}</small></strong></div>
        <div><span>Abstenção</span><strong>${fmt(d.abstencao)} <small class="muted">${pct(d.pctAbstencao)}</small></strong></div>
      </div>`
    : "";
  return `<section class="card">
    <div class="prog-topo"><div><h2>${esc(titulo)}</h2>${selo(and)}</div><div class="prog-pct">${pct(pc)} <small>das seções</small></div></div>
    <div class="barra-prog"><i style="width:${Math.min(100, pc)}%"></i></div>
    <p class="muted">${total ? `${fmt(apur)} de ${fmt(total)} seções apuradas` : ""}${quando ? ` · totalização do TSE: ${esc(quando)}` : ""}</p>
    ${estat}${d ? avisosApuracao(d) : ""}</section>`;
}

function blocoResultadoEvolucao(rp, local) {
  const largura = Math.max(300, Math.min(640, document.documentElement.clientWidth - 64));
  return `<section class="card"><h2>Evolução do resultado</h2>${linhasResultado(rp, local, corPartido, { largura })}
    <p class="muted">% dos votos válidos de cada candidato, apurado minuto a minuto.</p></section>`;
}

function blocoEvolucao(titulo, hist, serie, chave) {
  return `<section class="card"><h2>${esc(titulo)}</h2>${linhaEvolucao(hist, (p) => p[serie]?.[chave], { rotulo: titulo })}
    <p class="muted">% de seções apuradas ao longo do tempo (registro a cada minuto).</p></section>`;
}

const fotoDe = (aba, uf, c) => `<img class="foto" loading="lazy" alt="" src="${urlFoto(aba, uf, c.id)}" style="--cor:${corPartido(c.partido)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">`;

function itemCandidato({ pos, nome, sub, partido, votos, pctVotos, max, badge = "", foto = "", eleito = false, sq = "" }) {
  const cor = corPartido(partido);
  const ficha = sq ? ` data-sq="${esc(sq)}" role="button" tabindex="0" title="Ver ficha do candidato"` : "";
  return `<div class="rank-item ${foto === null ? "sf" : ""} ${eleito ? "eleito" : ""}" style="--cor:${cor}"${ficha}>
    <span class="pos">${pos}</span>${foto === null ? "" : foto}
    <div><div class="cand-nome">${esc(nome)}${badge}</div><div class="cand-sub"><span class="chip">${esc(partido)}</span>${esc(sub)}</div></div>
    <div class="cand-votos"><strong>${fmt(votos)}</strong><span class="muted">${pctVotos == null ? "" : pct(pctVotos)}</span></div>
    <div class="cand-barra"><i style="width:${max ? (votos / max) * 100 : 0}%"></i></div></div>`;
}

function listaMajoritaria(d, aba, uf, { limite = 40 } = {}) {
  const max = Math.max(1, ...d.candidatos.map((c) => c.votos));
  const vagas = d.vagas || 1;
  let html = "";
  d.candidatos.slice(0, limite).forEach((c, i) => {
    const badge = c.eleito ? `<span class="badge">${esc(c.situacao || "Eleito")}</span>`
      : c.situacao === "2º turno" ? `<span class="badge">2º turno</span>`
      : !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "";
    const foto = `<img class="foto" loading="lazy" alt="" src="${urlFoto(aba, uf, c.id)}" style="--cor:${corPartido(c.partido)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">`;
    html += itemCandidato({ pos: i + 1, nome: c.nome, sub: ` ${c.numero}`, partido: c.partido, votos: c.votos, pctVotos: c.pct, max, badge, foto, eleito: c.eleito, sq: c.id });
    if (aba === "senador" && vagas > 1 && i === vagas - 1 && d.candidatos.length > vagas) {
      html += `<div class="linha-corte">posição de eleito (${vagas} vagas)</div>`;
    }
  });
  return html || `<p class="muted">Sem candidatos neste arquivo.</p>`;
}

function blocoCadeiras({ titulo, subtitulo, partidos, totalVagas, rotuloTotal }) {
  const ocupadas = partidos.reduce((s, p) => s + p.vagas, 0);
  const quadrados = partidos.flatMap((p) => Array.from({ length: p.vagas }, () => `<i style="--cor:${corPartido(p.sigla)}" title="${esc(p.sigla)}"></i>`)).join("");
  const vazias = Array.from({ length: Math.max(0, totalVagas - ocupadas) }, () => `<i class="vazia"></i>`).join("");
  const legenda = partidos.filter((p) => p.vagas > 0)
    .map((p) => `<span><i class="pt" style="--cor:${corPartido(p.sigla)}"></i>${esc(p.sigla)}<b>${p.vagas}</b></span>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span><strong>${ocupadas}</strong> <span class="muted">de ${totalVagas} ${esc(rotuloTotal)}</span></span></div>
    <p class="muted">${esc(subtitulo)}</p>
    <div class="waffle" role="img" aria-label="${esc(titulo)}">${quadrados}${vazias}</div>
    <div class="legenda">${legenda || `<span class="muted">Nenhuma cadeira distribuída ainda.</span>`}</div></section>`;
}

const COMO = `<details class="como"><summary>Como as cadeiras são calculadas</summary><ol>
  <li>Quociente eleitoral (QE): votos válidos (candidatos e legendas, sem brancos e nulos) ÷ número de vagas. Fração até 0,5 é desprezada; acima disso, arredonda para cima.</li>
  <li>Quociente partidário (QP): votos do partido ou federação ÷ QE, sem as casas decimais. É o número de cadeiras da primeira etapa.</li>
  <li>Ocupam essas cadeiras os candidatos mais votados da legenda, desde que tenham pelo menos 10% do QE.</li>
  <li>Sobras, 1ª rodada: a cadeira vai, uma a uma, para a maior média (votos ÷ cadeiras já obtidas + 1), só entre partidos e federações com pelo menos 80% do QE, e candidatos com pelo menos 20% do QE.</li>
  <li>Sobras, última rodada: se ainda restarem vagas, todos os partidos e federações que disputaram concorrem pela maior média, sem as exigências de 80% e 20%. Essa é a mudança de 2022 para 2026.</li>
  <li>Se nenhum partido ou federação alcançar o QE, as vagas ficam com os candidatos mais votados (art. 111 do Código Eleitoral).</li>
  <li>Candidatos com voto anulado, anulado sub judice ou convertido em legenda não ocupam vaga.</li></ol>
  <p class="muted">Enquanto a apuração não termina, isto é uma projeção com os votos contados até agora. Na totalização final o site passa a mostrar os eleitos oficiais do TSE.</p></details>`;

function tabelaPartidos(dist, d) {
  const final = d.totalizacaoFinal;
  const linhas = dist.linhas.filter((l) => l.votos > 0 || l.vagas > 0).map((l) => `<tr>
    <td><span class="chip" style="--cor:${corPartido(l.sigla)}">${esc(l.sigla)}</span></td><td>${fmt(l.votos)}</td><td>${pct(l.pctVotos)}</td>
    <td><strong>${l.vagas}</strong></td><td>${l.qp}</td><td>${l.porQuociente}</td><td>${l.porSobras}</td>${final ? `<td>${l.oficial ?? ""}</td>` : ""}</tr>`).join("");
  return `<div class="tab-scroll"><table><tr><th>Partido / federação</th><th>Votos</th><th>% dos votos</th><th>Cadeiras</th><th>QP</th><th>Por quociente</th><th>Por sobras</th>${final ? "<th>Oficial TSE</th>" : ""}</tr>${linhas}</table></div>`;
}

function listaEleitos(d, dist) {
  const oficiais = d.candidatos.filter((c) => c.eleito);
  const usaOficial = d.totalizacaoFinal && oficiais.length > 0;
  const base = usaOficial
    ? oficiais.map((c) => ({ sq: c.id, foto: fotoDe(cargoAtivo(), estado.uf, c), nome: c.nome, partido: c.partido, votos: c.votos, sub: ` ${c.situacao}` }))
    : [...dist.eleitos].sort((a, b) => b.votos - a.votos).map((e) => ({ sq: e.id, foto: fotoDe(cargoAtivo(), estado.uf, { id: e.id, partido: e.partido }), nome: e.nome, partido: e.partido, votos: e.votos, sub: e.via === "quociente" ? " · quociente" : e.via === "art. 111" ? " · art. 111" : ` · sobra (${e.rodada ?? 1}ª rodada)` }));
  const max = Math.max(1, ...base.map((b) => b.votos));
  const itens = base.map((b, i) => itemCandidato({ pos: i + 1, ...b, pctVotos: null, max, eleito: true })).join("");
  return { titulo: usaOficial ? `Eleitos, resultado oficial do TSE (${base.length} de ${dist.vagas})` : `Eleitos, projeção (${base.length} de ${dist.vagas})`, itens };
}

function maisVotados(d, rotulo = "Candidatos por votos") {
  const max = Math.max(1, d.candidatos[0]?.votos ?? 1);
  const itens = d.candidatos.slice(0, estado.mostrar).map((c, i) =>
    itemCandidato({ pos: i + 1, nome: c.nome, sub: ` ${c.numero}`, partido: c.partido, votos: c.votos, pctVotos: null, max, foto: fotoDe(cargoAtivo(), estado.uf, c), sq: c.id,
      badge: c.eleito ? `<span class="badge">${esc(c.situacao || "Eleito")}</span>` : !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "", eleito: c.eleito })).join("");
  const mais = d.candidatos.length > estado.mostrar ? `<button class="mais" data-mais>Ver mais (${fmt(d.candidatos.length - estado.mostrar)} candidatos)</button>` : "";
  return `<section class="card"><h2>${esc(rotulo)} (${fmt(d.candidatos.length)})</h2>${itens}${mais}</section>`;
}

function carregandoEstados(titulo) {
  return `<section class="card"><h2>${esc(titulo)}</h2><p class="muted">Carregando os 27 estados…</p></section>`;
}

function telaMajoritaria(v) {
  const { d } = v, { uf, mun } = estado, aba = cargoAtivo();
  const local = mun ? `${nomeUF(uf)}, município ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : nomeUF(uf);
  const titulo = aba === "senador" ? `Senador (${d.vagas || 2} vagas): ${local}` : `${CARGOS[aba].nome}: ${local}`;
  const evolucao = !mun && aba === "presidente" ? blocoResultadoEvolucao(v.rp, chaveUF(uf)) : "";
  return `${blocoProgresso(titulo, d, null)}<section class="card"><h2>Candidatos por votos</h2>${listaMajoritaria(d, aba, uf)}</section>${evolucao}`;
}

function resumoEstado(v) {
  const { uf } = estado, k = uf.toLowerCase();
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, "", uf);
  const fed = v.f.ufs[k];
  const extra = `<p class="hero-sec">Eleitores aptos: <strong>${fmt(p.a.eleitores)}</strong></p>${fed ? `<p class="hero-sub">Presidente: ${pct(fed.pct, 1)} das seções</p>` : ""}`;
  const hero = heroApuracao({ ...p, titulo: UFS[uf], subtitulo: "Eleições estaduais", extra, hist: [], grafico: false });
  const dt = v.detalhe ?? {};
  const cards = [
    cardCargo({ titulo: "Governador", aba: "governador", uf, d: dt.gov }), cardCargo({ titulo: "Senador", aba: "senador", uf, d: dt.sen }),
    cardBancada({ titulo: "Deputados Federais", cargo: "dep-federal", d: dt.depf === undefined ? undefined : dt.depf?.d, dist: dt.depf?.dist }),
    cardBancada({ titulo: "Deputados Estaduais", cargo: "dep-estadual", d: dt.depe === undefined ? undefined : dt.depe?.d, dist: dt.depe?.dist }),
    cardCargo({ titulo: "Presidente no estado", aba: "presidente", uf, d: dt.pres }),
  ];
  return `${hero}<div class="carrossel carrossel-estado" role="region" aria-label="Resumo das eleições em ${esc(UFS[uf])}">${cards.join("")}</div>
    <p class="muted nota-estado">Deslize para ver todas as eleições. Porcentagens de candidatos: votos no candidato ÷ votos válidos.</p>`;
}

function telaEstados(v) {
  if (estado.cargo === "resumo") return resumoEstado(v);
  if (CARGOS[estado.cargo].proporcional) return telaProporcionalUF(v);
  return telaMajoritaria(v);
}

function telaPresidente(v) {
  const { regiao, uf, mun } = estado;
  const emRegiao = uf === "BR" && REGIOES[regiao];
  const ufsRegiao = emRegiao ? REGIOES[regiao].ufs : null;
  // Resultado do recorte escolhido: Brasil, região (soma dos estados), estado/exterior/município.
  // Estado: usa o arquivo próprio quando já chegou; até lá, o que a lista de estados já trouxe (sem município).
  const doEstado = v.duChave === `${uf}/${mun}` ? v.du : mun ? null : v.lista?.find((x) => x.uf === uf)?.d ?? null;
  let d = uf !== "BR" ? doEstado : v.d, carregando = uf !== "BR" && mun !== "" && !doEstado;
  if (emRegiao) {
    const ds = v.lista ? ufsRegiao.map((u) => v.lista.find((x) => x.uf === u)?.d) : [];
    d = v.lista ? agregarResultados(ds) : null; carregando = !v.lista;
  } else if (uf === "BR" && regiao === "exterior") {
    d = v.lista?.find((x) => x.uf === "ZZ")?.d ?? null; carregando = !v.lista;
  }
  const p = escopoDoPainel({ f: v.ac, e: { ufs: {} } }, uf === "BR" ? regiao : "", uf);
  const nome = mun ? `${nomeUF(uf)}, ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : p.titulo;
  // Município: o painel usa os números do próprio município (o arquivo de acompanhamento só vai até o estado).
  const painel = mun && d ? { ...p, subtitulo: "Município", a: { ...p.a, st: d.secoesApuradas, ts: d.secoesTotal, pct: d.pctSecoes }, andamento: d.andamento, quando: d.atualizadoEm } : p;
  const hero = heroApuracao({ ...painel, titulo: nome, hist: v.h, grafico: mun ? null : false });
  const chaveGrafico = uf !== "BR" ? chaveUF(uf) : regiao === "exterior" ? "zz" : emRegiao ? ufsRegiao.map((u) => u.toLowerCase()) : "br";
  const listaCand = d
    ? `${avisosApuracao(d)}${listaMajoritaria(d, "presidente", "BR")}${blocoVotos(d)}`
    : `<p class="muted">${carregando ? "Carregando…" : "Resultado indisponível no momento."}</p>`;
  const grafico = mun ? "" : blocoResultadoEvolucao(v.rp, chaveGrafico);
  return `${hero}
    <section class="card"><h2>Candidatos por votos</h2>${listaCand}</section>${grafico}${tabelaPresidentePorEstado(v, uf, emRegiao ? ufsRegiao : null)}`;
}

function tabelaPresidentePorEstado(v, uf, ufsRegiao) {
  if (uf !== "BR") return "";
  if (!v.lista) return carregandoEstados("Resultado por estado");
  const ufs = estado.regiao === "exterior" ? ["ZZ"] : ufsRegiao ?? [...Object.keys(UFS).sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR")), "ZZ"];
  const itens = ufs.map((u) => {
    const d = v.lista.find((x) => x.uf === u)?.d, ac = v.ac.ufs[u.toLowerCase()];
    const top = (d?.candidatos ?? []).filter((c) => c.votos > 0).slice(0, 2);
    const lids = top.length
      ? top.map((c) => `<span><span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>${esc(c.nome)} <b>${pct(c.pct, 1)}</b></span>`).join("")
      : `<span class="muted">Sem votos apurados</span>`;
    return `<li><button type="button" class="linha-estado" data-uf="${u}"><span class="sigla">${u === "ZZ" ? "EX" : u}</span>
      <span class="le-meio"><span class="le-nome">${esc(nomeUF(u))}</span><span class="le-lids">${lids}</span></span>
      <span class="linha-uf-pct">${pct(ac?.pct ?? 0, 1)}<small>apurado</small></span><span class="seta" aria-hidden="true">›</span></button></li>`;
  }).join("");
  return `<section class="card"><h2>Resultado por estado</h2><ul class="lista-estados">${itens}</ul>
    <p class="muted nota">Toque em um estado para ver o resultado dele. O resultado final da eleição presidencial é nacional.</p></section>`;
}

function telaProporcionalUF(v) {
  const { d, dist } = v, { uf } = estado, aba = cargoAtivo();
  const cadeiras = blocoCadeiras({
    titulo: `${CARGOS[aba].nome}: cadeiras por partido/federação`,
    subtitulo: dist.oficial ? "Distribuição oficial do TSE (totalização final)." : `Projeção com ${pct(d.pctSecoes)} das seções apuradas. Quociente eleitoral: ${fmt(dist.qe)}${d.qeTse ? ` (TSE: ${fmt(d.qeTse)})` : ""}.`,
    partidos: dist.linhas, totalVagas: dist.vagas, rotuloTotal: "cadeiras",
  });
  const el = listaEleitos(d, dist);
  return `${blocoProgresso(`${CARGOS[aba].nome}: ${nomeUF(uf)}`, d, null)}
    ${cadeiras}
    ${dist.art111 ? aviso("Nenhum partido ou federação alcançou o quociente eleitoral. Pelo art. 111 do Código Eleitoral, as vagas ficam com os candidatos mais votados.") : ""}
    <section class="card"><h2>Partidos e federações</h2>${tabelaPartidos(dist, d)}${COMO}</section>
    <section class="card"><h2>${el.titulo}</h2>${el.itens}</section>
    ${maisVotados(d)}`;
}

function telaNacionalProp(v) {
  const n = v.nacional;
  if (!n) return `${blocoProgresso("Brasil: Deputados", null, v.ac.ufs.br)}${blocoEvolucao("Evolução da apuração no Brasil", v.h, "e", "br")}${carregandoEstados("Câmara dos Deputados: cadeiras por partido/federação")}`;
  const parciais = n.ufs.filter((u) => !u.final).length;
  const cadeiras = blocoCadeiras({
    titulo: "Câmara dos Deputados: cadeiras por partido/federação",
    subtitulo: parciais ? `Previsão: soma dos 27 estados. ${parciais} estado(s) ainda sem totalização final.` : "Soma dos 27 estados, resultado oficial do TSE.",
    partidos: n.partidos, totalVagas: n.totalVagas, rotuloTotal: "cadeiras",
  });
  const linhas = n.partidos.map((p) => {
    const ufs = Object.entries(p.porUF).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([u, q]) => `${u} ${q}`).join(" · ");
    return `<tr><td><span class="chip" style="--cor:${corPartido(p.sigla)}">${esc(p.sigla)}</span></td><td><strong>${p.vagas}</strong></td><td>${p.confirmadas}</td><td>${fmt(p.votos)}</td><td style="text-align:left;white-space:normal">${esc(ufs)}</td></tr>`;
  }).join("");
  const porEstado = n.ufs.sort((a, b) => a.uf.localeCompare(b.uf)).map((u) => {
    const ban = [...u.bancadas].sort((a, b) => b.vagas - a.vagas).map((x) => `<span class="chip" style="--cor:${corPartido(x.sigla)}">${esc(x.sigla)} ${x.vagas}</span>`).join(" ");
    return `<tr class="clicavel" data-uf="${u.uf}"><td class="uf-nome">${esc(UFS[u.uf])}</td><td>${u.vagas}</td>
    <td><span class="mini-barra"><i style="width:${Math.min(100, u.pct)}%"></i></span>${pct(u.pct, 1)}</td><td>${u.oficial ? "oficial" : "projeção"}</td><td style="text-align:left;white-space:normal">${ban || "–"}</td></tr>`;
  }).join("");
  return `${blocoProgresso("Brasil: Deputados Federais", null, v.ac.ufs.br)}${blocoEvolucao("Evolução da apuração no Brasil", v.h, "e", "br")}${cadeiras}
    <section class="card"><h2>Quadro geral da Câmara por partido/federação</h2>
    <p class="muted">Previsão = soma das cadeiras de cada estado com os votos contados até agora. Confirmadas = cadeiras de estados já com totalização final (${n.confirmadasTotal} de ${n.totalVagas}).</p>
    <div class="tab-scroll"><table><tr><th>Partido / federação</th><th>Previsão</th><th>Confirmadas</th><th>Votos</th><th>Maiores bancadas por estado</th></tr>${linhas}</table></div>${COMO}</section>
    <section class="card"><h2>Apuração e cadeiras em cada estado</h2><div class="tab-scroll"><table><tr><th>Estado</th><th>Vagas</th><th>Apurado</th><th>Situação</th><th>Cadeiras por partido/federação</th></tr>${porEstado}</table></div>
    <p class="muted">Cada estado elege só os seus deputados. Clique em um estado para ver a distribuição detalhada.</p></section>`;
}

// A navegação fica fora do conteúdo: persiste e não perde a rolagem a cada atualização.
let navAnterior = "", subAnterior = "";
function renderNavegacao(v) {
  const nav = v.tipo === "andamento" ? navegacaoRegional(v.f, { regiao: estado.regiao, uf: estado.uf })
    : v.tipo === "presidente" ? navegacaoRegional(v.ac, { regiao: estado.regiao, uf: estado.uf })
    : estado.aba === "estados" ? tiraEstados(estado.uf, v.e) : "";
  const sub = estado.aba === "estados" ? barraEstado(estado.uf, estado.cargo) : "";
  const preserva = (el, html, anterior) => {
    if (html === anterior) return anterior;
    const rolagem = el.querySelector(".tira, .be-cargos, .chips")?.scrollLeft ?? 0;
    el.innerHTML = html;
    el.querySelectorAll(".tira, .be-cargos, .chips").forEach((c) => { c.scrollLeft = rolagem; });
    return html;
  };
  navAnterior = preserva($("nav"), nav, navAnterior);
  subAnterior = preserva($("sub"), sub, subAnterior);
  $("sub").hidden = !sub;
  // mantém o estado e o cargo escolhidos à vista nas faixas roláveis
  for (const sel of ["#nav .tira [aria-pressed=true]", "#sub [aria-selected=true]"]) document.querySelector(sel)?.scrollIntoView({ inline: "center", block: "nearest" });
}

function render() {
  const v = estado.view;
  if (!v) return;
  const tela = { andamento: (v) => telaMarcha(v, estado, false), estados: telaEstados, presidente: telaPresidente, "nacional-prop": telaNacionalProp }[v.tipo];
  renderNavegacao(v);
  $("conteudo").innerHTML = tela(v);
  if (estado.rolar) { estado.rolar = false; document.querySelector("li.aberto")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

// ---------- atualização automática (a cada 10 segundos) ----------
async function atualizar() {
  if (memo.carregando) { memo.pendente = true; return; }
  memo.carregando = true; memo.pendente = false;
  const chave = () => `${estado.aba}/${estado.uf}/${estado.cargo}/${estado.mun}`;
  const alvo = chave();
  try {
    const v = await carregarView();
    if (alvo === chave()) { estado.view = v; render(); memo.ultima = new Date(); memo.erro = ""; }
  } catch (e) {
    memo.erro = e.message;
    if (!estado.view) $("conteudo").innerHTML = aviso(`${e.message} Tentaremos de novo automaticamente.`);
  } finally {
    memo.carregando = false;
    memo.proxima = Date.now() + CONFIG.atualizarACadaSegundos * 1000;
    if (memo.pendente) atualizar();
  }
}

function mostrarStatus() {
  const el = $("status");
  const seg = Math.max(0, Math.ceil((memo.proxima - Date.now()) / 1000));
  el.classList.toggle("erro", !!memo.erro);
  el.textContent = memo.ultima
    ? `Atualizado às ${hora(memo.ultima)} · próxima em ${seg}s${memo.erro ? " · falha na última tentativa: " + memo.erro : ""}`
    : memo.erro || "Carregando…";
}

async function carregarMunicipios() {
  try { estado.municipios = lerMunicipios(await buscarJson(urlMunicipios())); montarControles(); } catch { /* segue sem a lista */ }
}

// ---------- eventos ----------
$("abas").addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b) navegar({ aba: b.dataset.aba, mun: "" }); });
$("mun").addEventListener("change", () => navegar({ mun: $("mun").value }));
$("nav").addEventListener("click", (e) => {
  const reg = e.target.closest("[data-regiao]");
  if (reg) { estado.regiao = reg.dataset.regiao; navegar({ uf: "BR", mun: "" }); return; }
  if (e.target.closest("[data-regiao-inteira]")) { navegar({ uf: "BR", mun: "" }); return; }
  const nav = e.target.closest("[data-nav-uf]");
  if (nav) { estado.rolar = true; navegar({ uf: nav.dataset.navUf, mun: "" }); return; }
});
// ---------- seleção de estado: tira, barra fixa e folha de busca ----------
const folha = $("seletor-estado");
function abrirSeletor() {
  folha.innerHTML = folhaEstados(estado.uf);
  folha.showModal();
  folha.querySelector("#busca-estado").focus();
}
function escolherEstado(uf) { if (folha.open) folha.close(); navegar({ uf, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
$("nav").addEventListener("click", (e) => { const b = e.target.closest("[data-pick-uf]"); if (b) navegar({ uf: b.dataset.pickUf, mun: "" }); });
$("sub").addEventListener("click", (e) => {
  if (e.target.closest("[data-abrir-seletor]")) { abrirSeletor(); return; }
  const c = e.target.closest("[data-cargo]");
  if (c) { navegar({ cargo: c.dataset.cargo, mun: "" }); window.scrollTo({ top: Math.min(window.scrollY, document.getElementById("sub").offsetTop), behavior: "smooth" }); }
});
folha.addEventListener("click", (e) => {
  if (e.target === folha || e.target.closest("[data-fechar-seletor]")) { folha.close(); return; }
  const b = e.target.closest("[data-escolher-uf]"); if (b) escolherEstado(b.dataset.escolherUf);
});
folha.addEventListener("input", (e) => {
  if (e.target.id !== "busca-estado") return;
  const achados = new Set(filtrarEstados(e.target.value));
  folha.querySelectorAll("[data-escolher-uf]").forEach((b) => { b.hidden = !achados.has(b.dataset.escolherUf); });
  folha.querySelectorAll(".grade-ufs").forEach((g) => { const h = g.previousElementSibling; const vazio = ![...g.children].some((b) => !b.hidden); g.hidden = vazio; if (h) h.hidden = vazio; });
  folha.querySelector(".vazio-busca").hidden = achados.size > 0;
});
folha.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "busca-estado") { const p = folha.querySelector("[data-escolher-uf]:not([hidden])"); if (p) escolherEstado(p.dataset.escolherUf); }
});
iniciarFicha();
function apuracaoDe(sq) {
  const fontes = [estado.view?.d, ...Object.values(estado.view?.detalhe ?? {})].filter(Boolean);
  const c = fontes.flatMap((f) => f.candidatos).find((x) => x.id === String(sq));
  return c ? { votos: c.votos, pct: c.pct, situacao: c.eleito ? c.situacao || "Eleito" : !c.elegivel ? c.situacaoVoto : null } : null;
}
$("conteudo").addEventListener("keydown", (e) => {
  const it = e.target.closest?.("[data-sq]");
  if (it && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirFicha(it.dataset.sq, apuracaoDe(it.dataset.sq)); }
});
$("conteudo").addEventListener("click", (e) => {
  const it = e.target.closest("[data-sq]");
  if (it) { abrirFicha(it.dataset.sq, apuracaoDe(it.dataset.sq)); return; }
  const ord = e.target.closest("[data-ordem]");
  if (ord) { estado.ordem = ord.dataset.ordem; render(); return; }
  const abrir = e.target.closest("[data-abrir-estado]");
  if (abrir) { navegar({ aba: "estados", uf: abrir.dataset.abrirEstado, cargo: "resumo", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const ir = e.target.closest("[data-ir]");
  if (ir) {
    const alvo = ir.dataset.ir;
    if (estado.aba === "estados") navegar({ cargo: alvo });
    else navegar(alvo === "presidente" ? { aba: "presidente", mun: "" } : { aba: "estados", uf: estado.uf === "BR" || estado.uf === "ZZ" ? estado.ufPadrao : estado.uf, cargo: alvo, mun: "" });
    window.scrollTo({ top: 0, behavior: "smooth" }); return;
  }
  const tr = e.target.closest("[data-uf]");
  if (tr && estado.aba === "andamento") { navegar({ uf: estado.uf === tr.dataset.uf ? "BR" : tr.dataset.uf, mun: "" }); return; } // abre/fecha o resumo na própria lista
  if (tr && estado.aba === "camara") { navegar({ aba: "estados", uf: tr.dataset.uf, cargo: "dep-federal", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (tr && estado.aba === "presidente") { navegar({ uf: tr.dataset.uf, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
});
addEventListener("hashchange", () => { lerHash(); montarControles(); atualizar(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });

const hashInicial = location.hash;
lerHash();
gravarHash(); // endereços antigos passam para o formato novo
montarControles();
carregarMunicipios();
// Primeira visita: abre a visão por estado no estado de quem acessa (a Cloudflare informa a região).
if (!ufGuardada()) {
  fetch("/api/meu-estado").then((r) => r.json()).then(({ uf }) => {
    if (!UFS[uf] || ufGuardada()) return;
    estado.ufPadrao = uf;
    if (estado.aba === "estados" && !hashInicial.split("/")[2]) navegar({ uf });
  }).catch(() => { /* fica com o padrão */ });
}
atualizar();
setInterval(atualizar, CONFIG.atualizarACadaSegundos * 1000);
setInterval(mostrarStatus, 1000);
