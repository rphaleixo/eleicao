import { telaMarcha, regiaoDe } from "./marcha.js";
import { abrirFicha, iniciarFicha } from "./candidato.js";
import { CONFIG, CARGOS, ABAS, UFS } from "./config.js";
import {
  urlsResultado, urlMunicipios, urlAcompanhamento, urlHistorico, urlResultadosPresidente, urlFoto,
  buscarJson, buscarPrimeiro, normalizar, lerMunicipios, lerAcompanhamento,
} from "./tse.js";
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { corPartido } from "./cores.js";
import { linhaEvolucao, linhasResultado, sparkline } from "./graficos.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
const pct = (n, c = 2) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }) + "%";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hora = (d) => d.toLocaleTimeString("pt-BR");
const nomeUF = (uf) => (uf === "BR" ? "Brasil" : uf === "ZZ" ? "Exterior" : UFS[uf] ?? uf);

const estado = { aba: "presidente", uf: "BR", mun: "", municipios: {}, mostrar: 50, view: null, serie: "f", regiao: "", ordem: "az" };
const memo = { historico: { t: 0, dados: [] }, ultima: null, proxima: 0, erro: "", carregando: false, pendente: false };

// ---------- navegação (guardada na URL: #/governador/SP/71072) ----------
function lerHash() {
  const [, aba, uf, mun] = location.hash.split("/");
  estado.aba = ABAS.some((a) => a.id === aba) ? aba : "presidente";
  const u = (uf || "BR").toUpperCase();
  estado.uf = u === "BR" || UFS[u] || (u === "ZZ" && (estado.aba === "presidente" || estado.aba === "andamento")) ? u : "BR"; // ZZ = voto no exterior (só Presidente)
  estado.mun = /^\d{5}$/.test(mun || "") && estado.uf !== "BR" ? mun : "";
  if (estado.uf !== "BR") estado.regiao = regiaoDe(estado.uf); // a região acompanha o estado da URL
}
const gravarHash = () => history.replaceState(null, "", "#/" + [estado.aba, estado.uf, estado.mun].filter(Boolean).join("/"));
const permiteMun = () => ["presidente", "governador", "senador"].includes(estado.aba) && estado.uf !== "BR" && estado.uf !== "ZZ";

function montarControles() {
  $("abas").innerHTML = ABAS.map((a) => `<button data-aba="${a.id}" aria-current="${a.id === estado.aba}">${a.nome}</button>`).join("");
  $("uf").innerHTML = `<option value="BR">Brasil</option>` + Object.entries(UFS).map(([s, n]) => `<option value="${s}">${n}</option>`).join("") +
    (estado.aba === "presidente" ? `<option value="ZZ">Exterior</option>` : "");
  $("uf").value = estado.uf;
  document.querySelector(".filtros").hidden = estado.aba === "andamento"; // na Marcha a navegação é pela lista de estados
  $("lbl-mun").hidden = !permiteMun();
  const lista = estado.municipios[estado.uf] || [];
  $("mun").innerHTML = `<option value="">Todo o estado</option>` + lista.map((m) => `<option value="${m.cod}">${esc(m.nome)}</option>`).join("");
  $("mun").value = estado.mun;
}

function navegar(mudanca) {
  Object.assign(estado, mudanca);
  if (estado.uf === "ZZ" && estado.aba !== "presidente" && estado.aba !== "andamento") estado.uf = "BR";
  if (mudanca.aba || mudanca.uf) estado.mun = mudanca.mun ?? "";
  estado.mostrar = 50;
  if (estado.aba === "andamento" && estado.view?.tipo === "andamento") { estado.view = { ...estado.view, detalhe: {} }; render(); } // o painel já tem os dados: mostra na hora, os líderes chegam depois
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

async function detalhesEstado(uf) {
  const talvez = (cargo) => obter(cargo, uf).catch(() => null);
  const [pres, gov, sen] = await Promise.all([talvez("presidente"), uf === "ZZ" ? null : talvez("governador"), uf === "ZZ" ? null : talvez("senador")]);
  return { pres, gov, sen };
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
  const cargo = CARGOS[aba];
  const acomp = obterAcompanhamento(aba);
  if (uf === "BR") {
    if (aba === "dep-federal") {
      const estados = emSegundoPlano("nacional", CONFIG.atualizarNacionalACadaSegundos * 1000, estadosDepFederal);
      const [ac, h] = await Promise.all([acomp, hist]);
      return { tipo: "nacional-prop", nacional: estados ? consolidarNacional(estados) : null, ac, h };
    }
    if (aba === "dep-estadual") {
      const [e, h] = await Promise.all([acomp, hist]);
      return { tipo: "estaduais-lista", ac: e, h };
    }
    const lista = emSegundoPlano("pan-" + aba, CONFIG.atualizarACadaSegundos * 900, () => panorama(aba));
    const [d, ac, h, rp] = await Promise.all([aba === "presidente" ? obter(aba, "BR") : null, acomp, hist, aba === "presidente" ? obterResultadosPresidente() : null]);
    return { tipo: "panorama", d, lista, ac, h, rp };
  }
  if (cargo.proporcional) {
    const [d, ac, h] = await Promise.all([obter(aba, uf), acomp, hist]);
    return { tipo: "prop", d, dist: distribuirEstado(d), ac, h };
  }
  const [d, ac, h, rp] = await Promise.all([obter(aba, uf, mun), acomp, hist, aba === "presidente" ? obterResultadosPresidente() : null]);
  return { tipo: "maj", d, ac, h, rp };
}

// ---------- peças de tela ----------
const TEXTO_ANDAMENTO = { n: "Apuração não iniciada", p: "Apuração em andamento", f: "Totalização finalizada" };
const selo = (a) => `<span class="selo ${a === "p" || a === "f" ? a : ""}">${TEXTO_ANDAMENTO[a] ?? ""}</span>`;
const serieDe = (aba) => (aba === "presidente" ? "f" : "e");
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
    ? oficiais.map((c) => ({ sq: c.id, foto: fotoDe(estado.aba, estado.uf, c), nome: c.nome, partido: c.partido, votos: c.votos, sub: ` ${c.situacao}` }))
    : [...dist.eleitos].sort((a, b) => b.votos - a.votos).map((e) => ({ sq: e.id, foto: fotoDe(estado.aba, estado.uf, { id: e.id, partido: e.partido }), nome: e.nome, partido: e.partido, votos: e.votos, sub: e.via === "quociente" ? " · quociente" : e.via === "art. 111" ? " · art. 111" : ` · sobra (${e.rodada ?? 1}ª rodada)` }));
  const max = Math.max(1, ...base.map((b) => b.votos));
  const itens = base.map((b, i) => itemCandidato({ pos: i + 1, ...b, pctVotos: null, max, eleito: true })).join("");
  return { titulo: usaOficial ? `Eleitos, resultado oficial do TSE (${base.length} de ${dist.vagas})` : `Eleitos, projeção (${base.length} de ${dist.vagas})`, itens };
}

function maisVotados(d, rotulo = "Candidatos por votos") {
  const max = Math.max(1, d.candidatos[0]?.votos ?? 1);
  const itens = d.candidatos.slice(0, estado.mostrar).map((c, i) =>
    itemCandidato({ pos: i + 1, nome: c.nome, sub: ` ${c.numero}`, partido: c.partido, votos: c.votos, pctVotos: null, max, foto: fotoDe(estado.aba, estado.uf, c), sq: c.id,
      badge: c.eleito ? `<span class="badge">${esc(c.situacao || "Eleito")}</span>` : !c.elegivel ? `<span class="badge neutro">${esc(c.situacaoVoto)}</span>` : "", eleito: c.eleito })).join("");
  const mais = d.candidatos.length > estado.mostrar ? `<button class="mais" data-mais>Ver mais (${fmt(d.candidatos.length - estado.mostrar)} candidatos)</button>` : "";
  return `<section class="card"><h2>${esc(rotulo)} (${fmt(d.candidatos.length)})</h2>${itens}${mais}</section>`;
}

function carregandoEstados(titulo) {
  return `<section class="card"><h2>${esc(titulo)}</h2><p class="muted">Carregando os 27 estados…</p></section>`;
}

function tabelaPanorama(aba, lista, ac) {
  if (!lista) return carregandoEstados("Resultado por estado");
  const linhas = lista.map(({ uf, d }) => {
    const k = uf.toLowerCase();
    const p = ac.ufs[k];
    const top = (d?.candidatos ?? []).filter((c) => c.votos > 0).slice(0, 2);
    const cel = (c) => c ? `<span class="chip" style="--cor:${corPartido(c.partido)}">${esc(c.partido)}</span>${esc(c.nome)} <span class="muted">${fmt(c.votos)}</span>` : "–";
    return `<tr class="clicavel" data-uf="${uf}"><td class="uf-nome">${esc(nomeUF(uf))}</td>
      <td>${p ? `<span class="mini-barra"><i style="width:${Math.min(100, p.pct)}%"></i></span>${pct(p.pct, 1)}` : "–"}</td>
      <td style="text-align:left">${cel(top[0])}</td><td style="text-align:left">${cel(top[1])}</td></tr>`;
  }).join("");
  return `<section class="card"><h2>${aba === "presidente" ? "Presidente: resultado por estado (o resultado final é nacional)" : aba === "senador" ? "Senador por estado: dois mais votados" : "Governador por estado"}</h2>
    <div class="tab-scroll"><table><tr><th>Estado</th><th>Apurado</th><th>1º</th><th>2º</th></tr>${linhas}</table></div></section>`;
}

// ---------- telas ----------
function telaMajoritaria(v) {
  const { d } = v, { aba, uf, mun } = estado;
  const local = mun ? `${nomeUF(uf)}, município ${(estado.municipios[uf] || []).find((m) => m.cod === mun)?.nome ?? mun}` : nomeUF(uf);
  const titulo = aba === "senador" ? `Senador (${d.vagas || 2} vagas): ${local}` : `${CARGOS[aba].nome}: ${local}`;
  const evolucao = mun ? "" : aba === "presidente" ? blocoResultadoEvolucao(v.rp, chaveUF(uf)) : blocoEvolucao(`Evolução da apuração em ${nomeUF(uf)}`, v.h, serieDe(aba), chaveUF(uf));
  return `${blocoProgresso(titulo, d, null)}${evolucao}<section class="card"><h2>Candidatos por votos</h2>${listaMajoritaria(d, aba, uf)}</section>`;
}

function telaPanorama(v) {
  const { aba } = estado;
  const progresso = v.d ? blocoProgresso("Presidente: Brasil", v.d, null) : blocoProgresso(`${CARGOS[aba].nome}: apuração nos estados`, null, v.ac.ufs.br);
  const lista = v.d ? `<section class="card"><h2>Candidatos por votos</h2>${listaMajoritaria(v.d, aba, "BR")}</section>` : "";
  const nota = aba === "presidente" ? "" : `<p class="aviso">${CARGOS[aba].nome} é eleição estadual: cada estado tem a sua disputa e não existe resultado nacional. O quadro abaixo só reúne os estados.</p>`;
  const evolucao = aba === "presidente" ? blocoResultadoEvolucao(v.rp, "br") : blocoEvolucao("Evolução da apuração no Brasil", v.h, serieDe(aba), "br");
  return `${progresso}${nota}${evolucao}${lista}${tabelaPanorama(aba, v.lista, v.ac)}`;
}

function telaProporcionalUF(v) {
  const { d, dist } = v, { aba, uf } = estado;
  const cadeiras = blocoCadeiras({
    titulo: `${CARGOS[aba].nome}: cadeiras por partido/federação`,
    subtitulo: dist.oficial ? "Distribuição oficial do TSE (totalização final)." : `Projeção com ${pct(d.pctSecoes)} das seções apuradas. Quociente eleitoral: ${fmt(dist.qe)}${d.qeTse ? ` (TSE: ${fmt(d.qeTse)})` : ""}.`,
    partidos: dist.linhas, totalVagas: dist.vagas, rotuloTotal: "cadeiras",
  });
  const el = listaEleitos(d, dist);
  return `${blocoProgresso(`${CARGOS[aba].nome}: ${nomeUF(uf)}`, d, null)}${blocoEvolucao(`Evolução da apuração em ${nomeUF(uf)}`, v.h, "e", chaveUF(uf))}
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

function telaEstaduaisLista(v) {
  const linhas = Object.keys(UFS).map((uf) => { const p = v.ac.ufs[uf.toLowerCase()];
    return `<tr class="clicavel" data-uf="${uf}"><td class="uf-nome">${esc(UFS[uf])}</td><td><span class="mini-barra"><i style="width:${Math.min(100, p?.pct ?? 0)}%"></i></span>${pct(p?.pct ?? 0, 1)}</td><td>${sparkline(v.h, (x) => x.e?.[uf.toLowerCase()])}</td><td>${selo(p?.andamento)}</td></tr>`; }).join("");
  return `${blocoProgresso("Brasil: eleições estaduais", null, v.ac.ufs.br)}${blocoEvolucao("Evolução da apuração no Brasil", v.h, "e", "br")}
    <section class="card"><h2>Deputados estaduais: escolha um estado</h2><p class="muted">Cada Assembleia Legislativa tem sua distribuição própria de cadeiras.</p>
    <div class="tab-scroll"><table><tr><th>Estado</th><th>Apurado</th><th>Evolução</th><th>Situação</th></tr>${linhas}</table></div></section>`;
}

function render() {
  const v = estado.view;
  if (!v) return;
  const tela = { andamento: (v) => telaMarcha(v, estado), maj: telaMajoritaria, panorama: telaPanorama, prop: telaProporcionalUF, "nacional-prop": telaNacionalProp, "estaduais-lista": telaEstaduaisLista }[v.tipo];
  $("conteudo").innerHTML = tela(v);
  if (estado.rolar) { estado.rolar = false; document.querySelector("li.aberto")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

// ---------- atualização automática (a cada 10 segundos) ----------
async function atualizar() {
  if (memo.carregando) { memo.pendente = true; return; }
  memo.carregando = true; memo.pendente = false;
  const alvo = `${estado.aba}/${estado.uf}/${estado.mun}`;
  try {
    const v = await carregarView();
    if (alvo === `${estado.aba}/${estado.uf}/${estado.mun}`) { estado.view = v; render(); memo.ultima = new Date(); memo.erro = ""; }
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
$("uf").addEventListener("change", () => navegar({ uf: $("uf").value, mun: "" }));
$("mun").addEventListener("change", () => navegar({ mun: $("mun").value }));
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
  const reg = e.target.closest("[data-regiao]");
  if (reg) { estado.regiao = reg.dataset.regiao; navegar({ uf: "BR", mun: "" }); return; }
  if (e.target.closest("[data-regiao-inteira]")) { navegar({ uf: "BR", mun: "" }); return; }
  const nav = e.target.closest("[data-nav-uf]");
  if (nav) { estado.rolar = true; navegar({ uf: nav.dataset.navUf, mun: "" }); return; }
  const ord = e.target.closest("[data-ordem]");
  if (ord) { estado.ordem = ord.dataset.ordem; render(); return; }
  const ir = e.target.closest("[data-ir]");
  if (ir) { navegar({ aba: ir.dataset.ir, mun: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (e.target.closest("[data-mais]")) { estado.mostrar += 50; render(); return; }
  const tr = e.target.closest("[data-uf]");
  if (tr && estado.aba === "andamento") { navegar({ uf: estado.uf === tr.dataset.uf ? "BR" : tr.dataset.uf, mun: "" }); return; } // abre/fecha o resumo na própria lista
  if (tr) {
    const aba = estado.aba === "andamento" ? "andamento" : estado.aba;
    navegar({ aba: aba === "dep-estadual" || aba === "dep-federal" || aba === "andamento" || aba === "presidente" || aba === "governador" || aba === "senador" ? aba : "presidente", uf: tr.dataset.uf, mun: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
addEventListener("hashchange", () => { lerHash(); montarControles(); atualizar(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });

lerHash();
montarControles();
carregarMunicipios();
atualizar();
setInterval(atualizar, CONFIG.atualizarACadaSegundos * 1000);
setInterval(mostrarStatus, 1000);
