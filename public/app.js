import { telaMarcha, regiaoDe, locaisResultado, navegacaoRegional, heroApuracao, escopoDoPainel, cardCargo, cardBancada, situacaoGeral, agregar, REGIOES } from "./marcha.js";
import { agregarResultados } from "./agregado.js";
import { fmt, pct } from "./formato.js";
import { rankingMajoritario } from "./ranking.js";
import { cardEstado, cardRegiao, gradeCards, linha2022 } from "./cardsEstados.js";
import { montarBancada, telaBancada } from "./bancada.js";
import { faixaDefinicao, legendaSituacao, TEXTO_SIT, situacaoEleicao } from "./situacao.js";
import { cartoesVotacao } from "./votacao.js";
import { lerRota, montarRota } from "./rota.js";
import { barraEstado, folhaEstados, filtrarEstados, vizinho } from "./seletor.js";
import { abrirFicha, iniciarFicha } from "./candidato.js";
import { CONFIG, CARGOS, ABAS, UFS, INICIO_APURACAO } from "./config.js";
import {
  urlsResultado, urlMunicipios, urlAcompanhamento, urlHistorico, urlResultadosPresidente, urlFoto,
  buscarJson, buscarPrimeiro, normalizar, lerMunicipios, lerAcompanhamento,
} from "./tse.js";
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { corPartido } from "./cores.js";
import { linhaEvolucao, linhasResultado } from "./graficos.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (d) => d.toLocaleTimeString("pt-BR");
const nomeUF = (uf) => (uf === "BR" ? "Brasil" : uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

const estado = { aba: "andamento", uf: "BR", cargo: "resumo", mun: "", municipios: {}, mostrar: 50, pagEleitos: 0, view: null, serie: "f", regiao: "", ordem: "az", painel: "geral", visaoSenado: "estados", agrupBancada: "partido" };
const memo = { historico: { t: 0, dados: [] }, ultima: null, proxima: 0, erro: "" };

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

const chaveRota = () => `${estado.aba}/${estado.uf}/${estado.cargo}/${estado.mun}${estado.aba === "presidente" ? "/" + estado.regiao : ""}${estado.aba === "senadores" ? "/" + estado.visaoSenado : ""}`; // na aba Presidente a região também muda a carga
const cacheViews = new Map(); // última resposta de cada tela: aparece na hora, e é atualizada em seguida

function mostrarCarregando() {
  estado.view = null;
  renderNavegacao(null);
  $("conteudo").innerHTML = `<section class="card carregando"><div class="barra-carregando"><i></i></div><p class="muted">Carregando${estado.aba === "estados" ? ` ${esc(UFS[estado.uf])}` : ""}…</p></section>`;
}

function navegar(mudanca) {
  Object.assign(estado, mudanca);
  if (estado.aba === "estados" && (estado.uf === "BR" || estado.uf === "ZZ")) estado.uf = estado.ufPadrao;
  if (estado.aba === "camara") estado.uf = "BR";
  if (estado.uf === "ZZ" && estado.aba !== "presidente" && estado.aba !== "andamento") estado.uf = "BR";
  if (mudanca.aba || mudanca.uf || mudanca.cargo) estado.mun = mudanca.mun ?? "";
  if (estado.aba === "estados") { guardarUf(estado.uf); estado.ufPadrao = estado.uf; }
  estado.mostrar = 50; estado.pagEleitos = 0;
  gravarHash(); montarControles();
  const guardada = cacheViews.get(chaveRota());
  if (guardada) { estado.view = guardada; render(); } // já vista: mostra na hora e atualiza em seguida
  else if (estado.view?.tipo === "presidente" && estado.aba === "presidente") render(); // tudo o que o painel precisa já está carregado
  else if (estado.aba === "andamento" && estado.view?.tipo === "andamento") { estado.view = { ...estado.view, detalhe: {} }; render(); } // o painel já tem os dados: mostra na hora, os líderes chegam depois
  else mostrarCarregando();
  atualizar();
}

// ---------- dados ----------
async function obter(cargo, uf, mun) {
  const { json } = await buscarPrimeiro(urlsResultado(cargo, uf, mun));
  return normalizar(json);
}
const obterAcompanhamento = async (cargo) => lerAcompanhamento(await buscarJson(urlAcompanhamento(cargo)));

const memoMandatos = { t: 0, dados: null };
async function obterMandatos() {
  if (memoMandatos.dados && Date.now() - memoMandatos.t < 3600_000) return memoMandatos.dados;
  try { memoMandatos.dados = await buscarJson("/api/senadores-mandato"); memoMandatos.t = Date.now(); } catch { memoMandatos.t = Date.now() - 3000_000; } // nova tentativa em ~10 min
  return memoMandatos.dados ?? { senadores: null }; // null = ainda não pedido; { senadores: null } = falhou
}

const memoRP = new Map();
async function obterResultadosPresidente(locais) {
  const chave = locais.join(",");
  const m = memoRP.get(chave);
  if (m && Date.now() - m.t < CONFIG.atualizarHistoricoACadaSegundos * 1000) return m.dados;
  let dados = m?.dados ?? null;
  try { dados = await buscarJson(urlResultadosPresidente(locais)); } catch { /* segue com o que já tinha */ }
  memoRP.set(chave, { t: Date.now(), dados });
  return dados;
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

async function carregarView(rota) {
  const { aba, uf, mun } = rota;
  const hist = obterHistorico();
  if (aba === "andamento") {
    const [f, e, h] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador"), hist]);
    // Resumo do estado aberto na lista: busca em segundo plano, sem travar o painel principal.
    const detalhe = uf === "BR" ? {} : emSegundoPlano("det-" + uf, 9000, () => detalhesEstado(uf)) ?? {};
    return { tipo: "andamento", f, e, h, detalhe };
  }
  if (aba === "estados") {
    const { cargo } = rota;
    const [f, e] = await Promise.all([obterAcompanhamento("presidente"), obterAcompanhamento("governador")]);
    const base = { tipo: "estados", uf, cargo, f, e };
    if (cargo === "resumo") return { ...base, detalhe: emSegundoPlano("detx-" + uf, 9000, () => detalhesEstado(uf, true)) ?? {} };
    if (CARGOS[cargo].proporcional) { const d = await obter(cargo, uf); return { ...base, d, dist: distribuirEstado(d) }; }
    const [d, rp] = await Promise.all([obter(cargo, uf, mun), cargo === "presidente" ? obterResultadosPresidente(locaisResultado(uf, "")) : null]);
    return { ...base, d, rp };
  }
  if (aba === "governadores" || aba === "senadores") {
    const cargo = aba === "governadores" ? "governador" : "senador";
    const lista = emSegundoPlano("pan-" + cargo, CONFIG.atualizarACadaSegundos * 900, () => panorama(cargo));
    const [e, mandatos] = await Promise.all([obterAcompanhamento("governador"), cargo === "senador" ? obterMandatos() : null]);
    return { tipo: "cargo-por-estado", cargo, e, lista, mandatos, visao: rota.visaoSenado };
  }
  const acomp = obterAcompanhamento(aba === "camara" ? "dep-federal" : aba);
  if (aba === "presidente") {
    // Os 28 locais (27 estados e exterior) vêm em segundo plano: alimentam as regiões e a lista de estados.
    const lista = emSegundoPlano("pan-presidente", CONFIG.atualizarACadaSegundos * 900, () => panorama("presidente"));
    const [d, du, ac, rp, h] = await Promise.all([obter("presidente", "BR"), uf === "BR" ? null : obter("presidente", uf, mun), acomp, obterResultadosPresidente(locaisResultado(uf, rota.regiao)), hist]);
    return { tipo: "presidente", d, du, duChave: `${uf}/${mun}`, lista, ac, rp, rpLocais: locaisResultado(uf, rota.regiao).join(","), h };
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
    d.semEleito && "O TSE não atribuiu eleitos neste cargo." + (d.motivosSemEleito.length ? " Motivo: " + d.motivosSemEleito.join("; ") : ""),
  ].filter(Boolean).map(aviso).join("");
}

function blocoProgresso(titulo, d, ac) {
  const p = ac ?? {};
  const pc = d ? d.pctSecoes : p.pct ?? 0;
  const apur = d ? d.secoesApuradas : p.st ?? 0, total = d ? d.secoesTotal : p.ts ?? 0;
  const and = d ? d.andamento : p.andamento;
  const quando = d?.atualizadoEm || [p.dt, p.ht].filter(Boolean).join(" ");
  return `<section class="card">
    <div class="prog-topo"><div><h2>${esc(titulo)}</h2>${selo(and)}</div><div class="prog-pct">${pct(pc)} <small>das seções</small></div></div>
    <div class="barra-prog"><i style="width:${Math.min(100, pc)}%"></i></div>
    <p class="muted">${total ? `${fmt(apur)} de ${fmt(total)} seções apuradas` : ""}${quando ? ` · totalização do TSE: ${esc(quando)}` : ""}</p>
    ${d ? faixaDefinicao(d) + avisosApuracao(d) : ""}</section>`;
}

function blocoResultadoEvolucao(rp, local, final = false) {
  const largura = Math.max(300, Math.min(640, document.documentElement.clientWidth - 64));
  const grafico = rp === undefined ? `<p class="muted vazio-grafico">Carregando o histórico…</p>`
    : linhasResultado(rp, local, corPartido, { largura, inicio: INICIO_APURACAO, ate: final ? 0 : Date.now() });
  return `<section class="card"><h2>Evolução do resultado</h2>${grafico}
    <p class="muted">% dos votos válidos de cada candidato, desde as 17h, minuto a minuto.</p></section>`;
}

function blocoEvolucao(titulo, hist, serie, chave) {
  return `<section class="card"><h2>${esc(titulo)}</h2>${linhaEvolucao(hist, (p) => p[serie]?.[chave], { rotulo: titulo, inicio: INICIO_APURACAO, ate: Date.now() })}
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

function blocoCadeiras({ titulo, subtitulo, partidos, totalVagas, rotuloTotal, progresso = "" }) {
  const ocupadas = partidos.reduce((s, p) => s + p.vagas, 0);
  const quadrados = partidos.flatMap((p) => Array.from({ length: p.vagas }, () => `<i style="--cor:${corPartido(p.sigla)}" title="${esc(p.sigla)}"></i>`)).join("");
  const vazias = Array.from({ length: Math.max(0, totalVagas - ocupadas) }, () => `<i class="vazia"></i>`).join("");
  const legenda = partidos.filter((p) => p.vagas > 0)
    .map((p) => `<span><i class="pt" style="--cor:${corPartido(p.sigla)}"></i>${esc(p.sigla)}<b>${p.vagas}</b></span>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span><strong>${ocupadas}</strong> <span class="muted">de ${totalVagas} ${esc(rotuloTotal)}</span></span></div>
    ${progresso}<p class="muted">${esc(subtitulo)}</p>
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

const POR_PAGINA = 15;

/** Candidatos eleitos (oficiais ou projetados), do mais votado ao menos votado. */
function dadosEleitos(d, dist) {
  const oficiais = d.candidatos.filter((c) => c.eleito);
  const usaOficial = d.totalizacaoFinal && oficiais.length > 0;
  const base = usaOficial
    ? oficiais.map((c) => ({ id: c.id, partido: c.partido, nome: c.nome, votos: c.votos, sub: c.situacao }))
    : [...dist.eleitos].sort((a, b) => b.votos - a.votos).map((e) => ({ id: e.id, partido: e.partido, nome: e.nome, votos: e.votos, sub: e.via === "quociente" ? "quociente" : e.via === "art. 111" ? "art. 111" : `sobra (${e.rodada ?? 1}ª rodada)` }));
  return { usaOficial, base };
}

/** Box dos eleitos: 15 por página, com a paginação dentro do próprio box. */
function boxEleitos(d, dist) {
  const { usaOficial, base } = dadosEleitos(d, dist);
  const paginas = Math.max(1, Math.ceil(base.length / POR_PAGINA));
  const pag = Math.min(Math.max(0, estado.pagEleitos), paginas - 1);
  const ini = pag * POR_PAGINA, fatia = base.slice(ini, ini + POR_PAGINA);
  const max = Math.max(1, base[0]?.votos ?? 1);
  const cargo = cargoAtivo();
  const itens = fatia.map((b, i) => `<li class="ce" style="--cor:${corPartido(b.partido)}" data-sq="${esc(b.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
      <span class="pos">${ini + i + 1}</span><img class="foto mini" loading="lazy" alt="" src="${urlFoto(cargo, estado.uf, b.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
      <span class="ce-nome"><b>${esc(b.nome)}</b><span class="chip" style="--cor:${corPartido(b.partido)}">${esc(b.partido)}</span><small>${esc(b.sub)}</small></span>
      <span class="ce-votos">${fmt(b.votos)}</span><span class="cr-barra"><i style="width:${(b.votos / max) * 100}%"></i></span></li>`).join("");
  const nav = paginas > 1
    ? `<nav class="paginacao" aria-label="Páginas dos eleitos"><button type="button" data-pag-eleitos="-1" ${pag === 0 ? "disabled" : ""}>‹ Anteriores</button>
        <span>${ini + 1}–${ini + fatia.length} de ${base.length}</span><button type="button" data-pag-eleitos="1" ${pag >= paginas - 1 ? "disabled" : ""}>Próximos ›</button></nav>` : "";
  return `<section class="card"><div class="titulo-cadeiras"><h2>Candidatos eleitos</h2><span class="muted">${base.length} de ${dist.vagas}</span></div>
    <p class="muted">${usaOficial ? "Resultado oficial do TSE." : "Projeção com os votos contados até agora."}</p>
    ${base.length ? `<ol class="lista-eleitos" start="${ini + 1}">${itens}</ol>${nav}` : `<p class="muted">Nenhum candidato eleito ainda.</p>`}</section>`;
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
  const evolucao = !mun && aba === "presidente" ? blocoResultadoEvolucao(v.rp, locaisResultado(uf, ""), d.totalizacaoFinal) : "";
  return `${blocoProgresso(titulo, d, null)}<section class="card"><h2>Candidatos por votos</h2>${rankingMajoritario(d, { aba, uf })}</section>${cartoesVotacao(d)}${evolucao}`;
}

function resumoEstado(v) {
  const { uf } = estado, k = uf.toLowerCase();
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, "", uf);
  const fed = v.f.ufs[k];
  const extra = `<p class="hero-sec">Eleitores aptos: <strong>${fmt(p.a.eleitores)}</strong></p>${fed ? `<p class="hero-sub">Presidente: ${pct(fed.pct)} das seções</p>` : ""}`;
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

function seletorSenado(visao) {
  return `<div class="seg visao-senado" role="group" aria-label="Visão do Senado"><button type="button" data-visao-senado="estados" aria-pressed="${visao !== "bancada"}">Por estado</button><button type="button" data-visao-senado="bancada" aria-pressed="${visao === "bancada"}">Bancada em 2027</button></div>`;
}

function telaBancadaSenado(v) {
  if (!v.lista || (v.mandatos === null)) return `${seletorSenado("bancada")}${telaBancada(null, { carregando: true })}`;
  if (!v.mandatos?.senadores) return `${seletorSenado("bancada")}<section class="card">${aviso("Não foi possível carregar a lista de senadores em exercício. Tentaremos de novo automaticamente.")}</section>`;
  const b = montarBancada({ mandatos: v.mandatos.senadores, resultados: v.lista });
  return `${seletorSenado("bancada")}${telaBancada(b, { versao: v.mandatos.versao, agrupamento: estado.agrupBancada })}`;
}

function telaCargoPorEstado(v) {
  if (v.cargo === "senador" && estado.visaoSenado === "bancada") return telaBancadaSenado(v);
  const { regiao } = estado, cargo = v.cargo, governador = cargo === "governador";
  const plural = governador ? "Governadores" : "Senadores", singular = governador ? "governador" : "senador";
  const ds = v.lista ? v.lista.map((x) => x.d).filter(Boolean) : [];
  const definidas = ds.filter((d) => situacaoEleicao(d) === "eleito").length, segundoTurno = ds.filter((d) => situacaoEleicao(d) === "segundo").length;
  const resumo = governador ? `${definidas} definido${definidas === 1 ? "" : "s"} · ${segundoTurno} no 2º turno` : `${definidas} eleição${definidas === 1 ? "" : "ões"} definida${definidas === 1 ? "" : "s"}`;
  // Governadores: só os cards. Senadores: o painel geral continua.
  const p = escopoDoPainel({ f: v.e, e: { ufs: {} } }, regiao === "exterior" ? "" : regiao, "BR");
  const hero = governador ? "" : heroApuracao({ ...p, titulo: regiao ? p.titulo : plural, subtitulo: regiao ? p.subtitulo : "2 vagas por estado, 54 no total", extra: v.lista ? `<p class="hero-sub">${resumo}</p>` : "", grafico: false, hist: [] });
  const ufs = (regiao && REGIOES[regiao] ? REGIOES[regiao].ufs : Object.keys(UFS)).slice();
  const apurado = (u) => v.e.ufs[u.toLowerCase()]?.pct ?? 0;
  ufs.sort(estado.ordem === "pct" ? (a, b) => apurado(b) - apurado(a) : (a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));
  const de2022 = new Map((v.mandatos?.senadores ?? []).map((x) => [x.uf, x]));
  const extra = (u) => (governador ? "" : linha2022(de2022.get(u)));
  const cards = v.lista ? ufs.map((u) => cardEstado(u, v.lista.find((x) => x.uf === u)?.d ?? null, v.e.ufs[u.toLowerCase()], cargo, 5, extra(u))) : null;
  return `${governador ? "" : seletorSenado("estados")}${hero}<section class="card"><div class="estados-topo"><h2>${governador ? "Governador" : "Senador"} por estado</h2>
      <div class="seg mini" role="group" aria-label="Ordenar"><button type="button" data-ordem="az" aria-pressed="${estado.ordem !== "pct"}">A–Z</button><button type="button" data-ordem="pct" aria-pressed="${estado.ordem === "pct"}">% apurado</button></div></div>
    ${governador ? `<p class="muted">${v.lista ? resumo : ""}</p>` : ""}${legendaSituacao(governador)}
    ${cards ? gradeCards(cards) : `<p class="muted">Carregando os 27 estados…</p>`}
    <p class="muted nota">Toque em um estado para ver a disputa completa de ${singular}.${governador ? "" : " Cada estado elege 2 senadores hoje; o terceiro foi eleito em 2022."} Abstenção sobre as seções já apuradas.</p></section>`;
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
  const locaisGrafico = locaisResultado(uf, regiao);
  const listaCand = d
    ? `${faixaDefinicao(d)}${avisosApuracao(d)}${rankingMajoritario(d, { aba: "presidente", uf: "BR" })}`
    : `<p class="muted">${carregando ? "Carregando…" : "Resultado indisponível no momento."}</p>`;
  const grafico = mun ? "" : blocoResultadoEvolucao(v.rpLocais === locaisGrafico.join(",") ? v.rp : undefined, locaisGrafico, d?.totalizacaoFinal);
  return `${hero}
    <section class="card"><h2>Candidatos por votos</h2>${listaCand}</section>${d ? cartoesVotacao(d) : ""}${grafico}${quadroPorRegiao(v, uf)}${tabelaPresidentePorEstado(v, uf, emRegiao ? ufsRegiao : null)}`;
}

/** Resultado da eleição presidencial em cada região (soma dos estados) e no exterior. */
function quadroPorRegiao(v, uf) {
  if (uf !== "BR") return "";
  if (!v.lista) return carregandoEstados("Resultado por região");
  const dDe = (u) => v.lista.find((x) => x.uf === u)?.d;
  const cards = Object.entries(REGIOES).map(([id, r]) => {
    const us = r.ufs.map((u) => v.ac.ufs[u.toLowerCase()]);
    return cardRegiao(id, r.nome, r.sigla, agregarResultados(r.ufs.map(dDe)), { ...agregar(us), andamento: situacaoGeral(us) });
  });
  if (v.ac.ufs.zz) cards.push(cardRegiao("exterior", "Exterior", "EX", dDe("ZZ") ?? null, { ...agregar([v.ac.ufs.zz]), andamento: v.ac.ufs.zz.andamento }));
  return `<section class="card"><h2>Resultado por região</h2>${gradeCards(cards)}
    <p class="muted nota">Soma dos estados de cada região. Toque em uma região para ver o resultado dela.</p></section>`;
}

function tabelaPresidentePorEstado(v, uf, ufsRegiao) {
  if (uf !== "BR") return "";
  if (!v.lista) return carregandoEstados("Resultado por estado");
  const ufs = estado.regiao === "exterior" ? ["ZZ"] : ufsRegiao ?? [...Object.keys(UFS).sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR")), "ZZ"];
  const cards = ufs.map((u) => cardEstado(u, v.lista.find((x) => x.uf === u)?.d ?? null, v.ac.ufs[u.toLowerCase()], "presidente"));
  return `<section class="card"><h2>Resultado por estado</h2>${gradeCards(cards)}
    <p class="muted nota">Toque em um estado para ver o resultado dele. O resultado final da eleição presidencial é nacional.</p></section>`;
}

function telaProporcionalUF(v) {
  const { d, dist } = v, { uf } = estado, aba = cargoAtivo();
  const quando = d.atualizadoEm ? ` · totalização do TSE: ${esc(d.atualizadoEm)}` : "";
  const progresso = `<div class="prog-mini"><div class="prog-linha">${selo(d.andamento)}<span><strong>${pct(d.pctSecoes)}</strong> das seções</span></div>
    <div class="barra-prog"><i style="width:${Math.min(100, d.pctSecoes)}%"></i></div>
    <p class="muted">${fmt(d.secoesApuradas)} de ${fmt(d.secoesTotal)} seções apuradas${quando}</p>${avisosApuracao(d)}</div>`;
  const cadeiras = blocoCadeiras({
    titulo: `${CARGOS[aba].nome}: ${nomeUF(uf)}`,
    subtitulo: dist.oficial ? "Cadeiras por partido/federação: distribuição oficial do TSE (totalização final)." : `Cadeiras por partido/federação, em projeção. Quociente eleitoral: ${fmt(dist.qe)}${d.qeTse ? ` (TSE: ${fmt(d.qeTse)})` : ""}.`,
    partidos: dist.linhas, totalVagas: dist.vagas, rotuloTotal: "cadeiras", progresso,
  });
  return `${cadeiras}
    ${dist.art111 ? aviso("Nenhum partido ou federação alcançou o quociente eleitoral. Pelo art. 111 do Código Eleitoral, as vagas ficam com os candidatos mais votados.") : ""}
    ${boxEleitos(d, dist)}
    <section class="card"><h2>Partidos e federações</h2>${tabelaPartidos(dist, d)}${COMO}</section>
    ${cartoesVotacao(d, { proporcional: true })}
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
    <td><span class="mini-barra"><i style="width:${Math.min(100, u.pct)}%"></i></span>${pct(u.pct)}</td><td>${u.oficial ? "oficial" : "projeção"}</td><td style="text-align:left;white-space:normal">${ban || "–"}</td></tr>`;
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
let ultimoAc = null; // andamento por estado mais recente, para a navegação aparecer enquanto a tela carrega
function renderNavegacao(v) {
  ultimoAc = v?.f ?? v?.ac ?? v?.e ?? ultimoAc;
  const nav = (estado.aba === "andamento" || estado.aba === "presidente" || estado.aba === "governadores" || (estado.aba === "senadores" && estado.visaoSenado !== "bancada")) && ultimoAc
    ? navegacaoRegional(ultimoAc, { regiao: estado.regiao, uf: estado.uf, comExterior: estado.aba === "andamento" || estado.aba === "presidente", comEstados: estado.aba === "andamento" || estado.aba === "presidente" }) : "";
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
  const tela = { andamento: (v) => telaMarcha(v, estado, false), estados: telaEstados, presidente: telaPresidente, "cargo-por-estado": telaCargoPorEstado, "nacional-prop": telaNacionalProp }[v.tipo];
  renderNavegacao(v);
  $("conteudo").innerHTML = tela(v);
  if (estado.rolar) { estado.rolar = false; document.querySelector("li.aberto")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

// ---------- atualização automática (a cada 10 segundos) ----------
// Cada tela carrega por conta própria: trocar de visão nunca espera uma carga anterior terminar.
const emVoo = new Set();
async function atualizar() {
  const chave = chaveRota();
  if (emVoo.has(chave)) return; // esta tela já está sendo carregada
  emVoo.add(chave);
  const rota = { ...estado };
  try {
    const v = await carregarView(rota);
    cacheViews.set(chave, v);
    if (chave === chaveRota()) { estado.view = v; render(); memo.ultima = new Date(); memo.erro = ""; }
  } catch (e) {
    if (chave === chaveRota()) {
      memo.erro = e.message;
      if (!cacheViews.has(chave)) $("conteudo").innerHTML = `<section class="card">${aviso(`${e.message} Tentaremos de novo automaticamente.`)}<button type="button" class="link" data-tentar>Tentar agora</button></section>`;
    }
  } finally {
    emVoo.delete(chave);
    if (chave === chaveRota()) memo.proxima = Date.now() + CONFIG.atualizarACadaSegundos * 1000;
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
$("abas").addEventListener("click", (e) => { const b = e.target.closest("[data-aba]"); if (b) { estado.regiao = ""; navegar({ aba: b.dataset.aba, uf: "BR", cargo: "resumo", mun: "" }); window.scrollTo({ top: 0 }); } }); // trocar de aba recomeça do Brasil, sem carregar o estado da aba anterior
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
  folha.innerHTML = folhaEstados(estado.uf, estado.view?.e);
  folha.showModal();
  folha.querySelector("#busca-estado").focus();
}
function escolherEstado(uf) { if (folha.open) folha.close(); navegar({ uf, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }
$("sub").addEventListener("click", (e) => {
  if (e.target.closest("[data-abrir-seletor]")) { abrirSeletor(); return; }
  const viz = e.target.closest("[data-vizinho]");
  if (viz) { navegar({ uf: vizinho(estado.uf, Number(viz.dataset.vizinho)), mun: "" }); return; }
  const c = e.target.closest("[data-cargo]");
  if (c) { navegar({ cargo: c.dataset.cargo, mun: "" }); window.scrollTo({ top: Math.min(window.scrollY, document.getElementById("sub").offsetTop), behavior: "smooth" }); }
});
folha.addEventListener("click", (e) => {
  if (e.target === folha || e.target.closest("[data-fechar-seletor]")) { folha.close(); return; }
  const b = e.target.closest("[data-escolher-uf]"); if (b) escolherEstado(b.dataset.escolherUf);
});
folha.addEventListener("input", (e) => {
  if (e.target.id !== "busca-estado") return;
  const texto = e.target.value.trim(), lista = folha.querySelector(".lista-busca");
  const achados = texto ? filtrarEstados(texto) : [];
  lista.hidden = !texto;
  folha.querySelector(".mapa-brasil").hidden = !!texto;
  folha.querySelector(".nome-estado-mapa").hidden = !!texto;
  lista.innerHTML = achados.length
    ? achados.map((u) => `<li><button type="button" data-escolher-uf="${u}"><b>${u}</b> ${esc(UFS[u])}</button></li>`).join("")
    : `<li class="muted">Nenhum estado encontrado.</li>`;
});
const nomeDoMapa = (e) => { const t = e.target.closest?.(".tile"); const el = folha.querySelector("#nome-estado-mapa"); if (t && el) el.textContent = UFS[t.dataset.escolherUf]; };
folha.addEventListener("pointerover", nomeDoMapa); folha.addEventListener("focusin", nomeDoMapa);
folha.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "busca-estado") { const p = folha.querySelector(".lista-busca [data-escolher-uf]"); if (p) escolherEstado(p.dataset.escolherUf); }
});
iniciarFicha();
function apuracaoDe(sq) {
  const fontes = [estado.view?.d, ...Object.values(estado.view?.detalhe ?? {})].filter(Boolean);
  const c = fontes.flatMap((f) => f.candidatos).find((x) => x.id === String(sq));
  return c ? { votos: c.votos, pct: c.pct, situacao: c.sit ? TEXTO_SIT[c.sit] : c.eleito ? c.situacao || "Eleito" : !c.elegivel ? c.situacaoVoto : null } : null;
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
  if (e.target.closest("[data-tentar]")) { atualizar(); return; }
  const agrup = e.target.closest("[data-agrup-bancada]");
  if (agrup) { estado.agrupBancada = agrup.dataset.agrupBancada; render(); return; }
  const visao = e.target.closest("[data-visao-senado]");
  if (visao) { estado.visaoSenado = visao.dataset.visaoSenado; navegar({}); return; }
  const painel = e.target.closest("[data-painel]");
  if (painel) { estado.painel = painel.dataset.painel; render(); return; }
  const regCard = e.target.closest("[data-regiao]");
  if (regCard) { estado.regiao = regCard.dataset.regiao; navegar({ uf: "BR", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  const pag = e.target.closest("[data-pag-eleitos]");
  if (pag) { estado.pagEleitos = Math.max(0, estado.pagEleitos + Number(pag.dataset.pagEleitos)); render(); return; }
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
  if (tr && (estado.aba === "governadores" || estado.aba === "senadores")) { navegar({ aba: "estados", uf: tr.dataset.uf, cargo: estado.aba === "governadores" ? "governador" : "senador", mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
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
