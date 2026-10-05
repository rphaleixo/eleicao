// Desempenho geral de um partido: majoritárias (vitórias x derrotas), deputados federais e estaduais e cláusula de desempenho.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { semSubJudice } from "./base.js";
import { situacaoEleicao } from "./situacao.js";
import { calcularClausula, cardClausula } from "./clausula.js";
import { urlFoto } from "./tse.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reais = (d) => (d?.candidatos ?? []).filter((c) => !c.subJudice || !semSubJudice());

/** Todos os partidos que aparecem nos dados carregados, com o total de candidaturas, em ordem alfabética. */
export function listaDePartidos({ pres, gov, sen, depf, depe }) {
  const m = new Map();
  const soma = (d) => { for (const c of d?.candidatos ?? []) if (c.partido) m.set(c.partido, (m.get(c.partido) ?? 0) + 1); };
  soma(pres); for (const x of gov ?? []) soma(x.d); for (const x of sen ?? []) soma(x.d); for (const x of depf ?? []) soma(x.d); for (const x of depe ?? []) soma(x.d);
  return [...m].map(([sigla, n]) => ({ sigla, n })).sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
}

/** Resultado de um candidato em uma disputa majoritária: vitoria, segundo, derrota ou aberto. */
export function resultadoMajoritario(c, d, cargo) {
  if (c.sit === "eleito") return "vitoria";
  if (c.sit === "segundo") return "segundo";
  if (cargo === "senador") {
    const eleitos = d.candidatos.filter((x) => x.sit === "eleito").length;
    return eleitos >= (d.vagas || 2) || d.totalizacaoFinal ? "derrota" : "aberto";
  }
  return situacaoEleicao(d) || d.totalizacaoFinal ? "derrota" : "aberto"; // eleição definida sem ele (eleito ou 2º turno), ou apuração final
}

/** Linhas de um cargo majoritário para o partido: uma por candidato dele em cada disputa. */
function disputas(sigla, itens, cargo) {
  const linhas = [];
  for (const { uf, d } of itens ?? []) {
    if (!d) continue;
    const ord = reais(d).filter((c) => c.elegivel && c.votos > 0).sort((a, b) => b.votos - a.votos);
    for (const c of reais(d).filter((x) => x.partido === sigla)) {
      linhas.push({ uf, cargo, c, pos: ord.findIndex((x) => x.id === c.id) + 1 || null, votos: c.votos, pct: c.pct, validos: d.votosValidos || 0, resultado: resultadoMajoritario(c, d, cargo), subJudice: !!c.subJudice });
    }
  }
  return linhas;
}

export function resumoMajoritario(linhas) {
  const n = (r) => linhas.filter((l) => l.resultado === r).length;
  const votos = linhas.reduce((t, l) => t + l.votos, 0), validos = linhas.reduce((t, l) => t + l.validos, 0);
  return { candidaturas: linhas.length, vitorias: n("vitoria"), segundos: n("segundo"), derrotas: n("derrota"), abertas: n("aberto"), votos, pct: validos ? (votos / validos) * 100 : 0 };
}

/** Eleitos de um estado (oficiais ou projetados) na ordem de votos. */
function eleitosDoEstado(d, dist) {
  const oficiais = d.candidatos.filter((c) => c.eleito);
  const usaOficial = !semSubJudice() && d.totalizacaoFinal && oficiais.length > 0;
  const ids = usaOficial ? new Set(oficiais.map((c) => c.id)) : new Set((dist?.eleitos ?? []).map((e) => e.id));
  return { ids, oficial: usaOficial };
}

/** Deputados do partido: eleitos, candidatos, votos nominais, bancada da federação e o detalhe por estado. */
export function desempenhoDeputados(sigla, estados) {
  let eleitos = 0, candidatos = 0, votosNominais = 0, validos = 0, vagas = 0, oficiais = 0, bancadaFed = 0, votosFed = 0, federacao = "";
  const porUf = [];
  for (const { uf, d, dist } of estados ?? []) {
    const meus = reais(d).filter((c) => c.partido === sigla);
    validos += dist?.votosValidos || 0; vagas += dist?.vagas || d.vagas || 0;
    if (!meus.length) continue;
    federacao ||= meus.find((c) => c.federacao)?.federacao ?? "";
    const { ids, oficial } = eleitosDoEstado(d, dist);
    if (oficial) oficiais++;
    const ele = meus.filter((c) => ids.has(c.id));
    const linhaFed = dist?.linhas?.find((l) => l.sigla === (meus[0].federacao || sigla));
    bancadaFed += linhaFed?.vagas || 0; votosFed += linhaFed?.votos || 0;
    const votos = meus.reduce((t, c) => t + c.votos, 0);
    eleitos += ele.length; candidatos += meus.length; votosNominais += votos;
    porUf.push({ uf, eleitos: ele.length, candidatos: meus.length, votos, pct: dist?.votosValidos ? (votos / dist.votosValidos) * 100 : 0, nomes: ele.sort((a, b) => b.votos - a.votos).map((c) => c.nome), vagasUf: dist?.vagas || d.vagas || 0, bancadaFed: linhaFed?.vagas || 0 });
  }
  porUf.sort((a, b) => b.eleitos - a.eleitos || b.votos - a.votos);
  return { eleitos, candidatos, votosNominais, pctNominais: validos ? (votosNominais / validos) * 100 : 0, vagas, federacao, bancadaFed, votosFed, pctFed: validos ? (votosFed / validos) * 100 : 0, estados: porUf.length, oficiais, porUf };
}

/** Visão completa de um partido com tudo o que está carregado. Qualquer parte pode faltar (null) enquanto carrega. */
export function desempenhoPartido(sigla, { pres, gov, sen, depf, depe }) {
  const presLinhas = pres ? disputas(sigla, [{ uf: "BR", d: pres }], "presidente") : null;
  const govLinhas = gov ? disputas(sigla, gov, "governador") : null;
  const senLinhas = sen ? disputas(sigla, sen, "senador") : null;
  const df = depf ? desempenhoDeputados(sigla, depf) : null;
  const de = depe ? desempenhoDeputados(sigla, depe) : null;
  const federacao = df?.federacao || de?.federacao || "";
  const cc = depf ? calcularClausula(depf) : null;
  const clausula = cc ? cc.partidos.find((p) => p.sigla === (federacao || sigla)) ?? null : null;
  const todas = [...(presLinhas ?? []), ...(govLinhas ?? []), ...(senLinhas ?? [])];
  return { sigla, federacao, pres: presLinhas, gov: govLinhas, sen: senLinhas, depf: df, depe: de, clausula, clausulaFinal: !!cc?.final,
    resumo: { pres: presLinhas && resumoMajoritario(presLinhas), gov: govLinhas && resumoMajoritario(govLinhas), sen: senLinhas && resumoMajoritario(senLinhas), total: resumoMajoritario(todas) } };
}

// ---------- HTML ----------
const ROTULO = { vitoria: "Vitória", segundo: "2º turno", derrota: "Derrota", aberto: "Em aberto" };
const pilula = (r) => `<span class="pp-res ${r}">${r === "vitoria" ? "✓ " : ""}${ROTULO[r]}</span>`;
const tile = (valor, rotulo, sub = "", classe = "") => `<div class="pp-tile ${classe}"><strong>${valor}</strong><span>${rotulo}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
const carregando = (rotulo) => `<p class="muted">Carregando ${rotulo}…</p>`;

function tabelaMajoritaria(r) {
  const linha = (nome, x) => (x ? `<tr><th scope="row">${nome}</th><td>${x.candidaturas}</td><td><b class="pp-v">${x.vitorias}</b></td><td>${x.segundos}</td><td>${x.derrotas}</td><td>${x.abertas}</td><td>${fmt(x.votos)}</td><td>${x.candidaturas ? pct(x.pct) : "–"}</td></tr>` : "");
  return `<div class="tab-scroll"><table class="pp-tabela"><tr><th></th><th>Candidaturas</th><th>Vitórias</th><th>2º turno</th><th>Derrotas</th><th>Em aberto</th><th>Votos</th><th>% dos válidos</th></tr>
    ${linha("Presidente", r.pres)}${linha("Governador", r.gov)}${linha("Senador", r.sen)}${linha("Total", r.total).replace("<tr>", '<tr class="pp-total">')}</table></div>`;
}

function listaDisputas(linhas, titulo) {
  if (!linhas?.length) return "";
  const ord = linhas.slice().sort((a, b) => ({ vitoria: 0, segundo: 1, aberto: 2, derrota: 3 }[a.resultado] - { vitoria: 0, segundo: 1, aberto: 2, derrota: 3 }[b.resultado]) || b.pct - a.pct);
  return `<h3>${titulo}</h3><ul class="pp-disputas">${ord.map((l) => `<li class="pp-d ${l.resultado}" data-sq="${esc(l.c.id)}" role="button" tabindex="0" title="Ver ficha do candidato">
    <img class="foto mini" loading="lazy" alt="" src="${urlFoto(l.cargo, l.uf === "BR" ? "BR" : l.uf, l.c.id)}" onerror="this.onerror=null;this.src='img/sem-foto.png'">
    <span class="pp-d-quem"><b>${esc(l.c.nome)}</b><small class="muted">${l.uf === "BR" ? "Brasil" : esc(UFS[l.uf] ?? l.uf)}${l.pos ? ` · ${l.pos}º colocado` : ""}${l.subJudice ? " · sub judice" : ""}</small></span>
    <span class="pp-d-num"><strong>${pct(l.pct)}</strong><small>${fmt(l.votos)}</small></span>${pilula(l.resultado)}</li>`).join("")}</ul>`;
}

function blocoDeputados(rotulo, dd, carregandoDados) {
  if (!dd) return `<section class="card"><h2>${rotulo}</h2>${carregando(rotulo.toLowerCase())}</section>`;
  if (!dd.candidatos) return `<section class="card"><h2>${rotulo}</h2><p class="muted">O partido não teve candidatos neste cargo.</p></section>`;
  const linhas = dd.porUf.map((u) => `<tr><td><b>${u.uf}</b> <small class="muted">${esc(UFS[u.uf])}</small></td><td><b class="pp-v">${u.eleitos}</b></td><td>${u.candidatos}</td><td>${fmt(u.votos)}</td><td>${pct(u.pct)}</td><td class="pp-nomes">${u.nomes.map(esc).join(", ") || "–"}</td></tr>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>${rotulo}</h2><span class="muted">${dd.estados} estados</span></div>
    <div class="pp-tiles">${tile(dd.eleitos, dd.eleitos === 1 ? "eleito" : "eleitos", dd.oficiais === dd.estados ? "resultado oficial" : "projeção", "eleito")}${tile(dd.candidatos, "candidatos")}${tile(fmt(dd.votosNominais), "votos nominais", `${pct(dd.pctNominais)} dos válidos`)}${dd.federacao ? tile(dd.bancadaFed, "da federação", `${esc(dd.federacao)} · ${pct(dd.pctFed)} dos válidos`) : ""}</div>
    ${linhas ? `<div class="tab-scroll"><table class="pp-tabela pp-uf"><tr><th>Estado</th><th>Eleitos</th><th>Candidatos</th><th>Votos nominais</th><th>% dos válidos</th><th>Quem foi eleito</th></tr>${linhas}</table></div>` : ""}
    <p class="muted nota">As cadeiras são da federação (ou do partido, se concorreu sozinho); aqui contam os candidatos eleitos do partido. Votos nominais = soma dos votos nos candidatos dele.</p></section>`;
}

/** Tela completa do partido. `seletor` = HTML do seletor de partido. */
export function blocoPartido(des, seletor = "") {
  const r = des.resumo, gov = des.resumo.gov, sen = des.resumo.sen;
  const cl = des.clausula;
  const tiles = `<div class="pp-tiles">
    ${tile(gov ? gov.vitorias : "…", "governos eleitos", gov ? `${gov.segundos} no 2º turno · ${gov.candidaturas} candidaturas` : "", "eleito")}
    ${tile(sen ? sen.vitorias : "…", "senadores eleitos", sen ? `${sen.candidaturas} candidaturas` : "", "eleito")}
    ${tile(des.depf ? des.depf.eleitos : "…", "dep. federais", des.depf ? `${des.depf.candidatos} candidatos` : "", "eleito")}
    ${tile(des.depe ? des.depe.eleitos : "…", "dep. estaduais", des.depe ? `${des.depe.candidatos} candidatos` : "", "eleito")}
    ${cl ? tile(cl.status === "atingiu" ? "✓" : cl.status === "nao" ? "✕" : "…", "cláusula", cl.status === "atingiu" ? "atingiu" : cl.status === "nao" ? "não atingiu" : "ainda pode atingir", cl.status) : des.depf ? tile("–", "cláusula", "sem candidatos a dep. federal") : ""}</div>`;
  const maj = (r.pres || r.gov || r.sen)
    ? `${tabelaMajoritaria(r)}<p class="pp-saldo">Saldo nas majoritárias: <b>${r.total.vitorias}</b> vitória${r.total.vitorias === 1 ? "" : "s"} × <b>${r.total.derrotas}</b> derrota${r.total.derrotas === 1 ? "" : "s"}${r.total.segundos ? ` · ${r.total.segundos} em 2º turno` : ""}${r.total.abertas ? ` · ${r.total.abertas} em aberto` : ""}</p>${listaDisputas(des.pres, "Presidente")}${listaDisputas(des.gov, "Governador")}${listaDisputas(des.sen, "Senador")}`
    : carregando("as eleições majoritárias");
  return `<section class="card pp-topo" style="--cor:${corPartido(des.sigla)}"><div class="pp-cabeca"><span class="chip pp-chip" style="--cor:${corPartido(des.sigla)}">${esc(des.sigla)}</span>${des.federacao ? `<span class="muted">Federação ${esc(des.federacao)}</span>` : ""}</div>${seletor}${tiles}</section>
    <section class="card"><h2>Eleições majoritárias</h2>${maj}</section>
    ${blocoDeputados("Deputados federais", des.depf)}
    ${blocoDeputados("Deputados estaduais", des.depe)}
    <section class="card"><h2>Cláusula de desempenho</h2>${cl ? `<ul class="cards-estados cards-cl">${cardClausula(cl, des.clausulaFinal)}</ul>` : des.depf ? `<p class="muted">O partido não teve candidatos a deputado federal.</p>` : carregando("a cláusula")}
      <p class="muted nota">Medida sobre os votos válidos para a Câmara, por regra legal. A federação conta como um só partido.</p></section>`;
}
