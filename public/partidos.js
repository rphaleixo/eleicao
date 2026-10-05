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
function disputas(sigla, itens, cargo, segundoTurno = null) {
  const linhas = [];
  for (const { uf, d } of itens ?? []) {
    if (!d) continue;
    const d2 = segundoTurno?.get(uf) ?? null; // resultado do 2º turno desta disputa, se já existe
    const ord = reais(d).filter((c) => c.elegivel && c.votos > 0).sort((a, b) => b.votos - a.votos);
    for (const c of reais(d).filter((x) => x.partido === sigla)) {
      let resultado = resultadoMajoritario(c, d, cargo), turno2 = null;
      if (resultado === "segundo" && d2) { // quem foi ao 2º turno: vitória ou derrota lá, ou segue em disputa
        const c2 = d2.candidatos.find((x) => x.id === c.id);
        if (c2) { turno2 = { pct: c2.pct, votos: c2.votos }; resultado = c2.sit === "eleito" ? "vitoria" : situacaoEleicao(d2) === "eleito" ? "derrota" : "segundo"; }
      }
      linhas.push({ uf, cargo, c, pos: ord.findIndex((x) => x.id === c.id) + 1 || null, votos: c.votos, pct: c.pct, validos: d.votosValidos || 0, resultado, turno2, subJudice: !!c.subJudice });
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
export function desempenhoPartido(sigla, { pres, gov, sen, depf, depe, pres2 = null, gov2 = null }) {
  const presLinhas = pres ? disputas(sigla, [{ uf: "BR", d: pres }], "presidente", pres2 ? new Map([["BR", pres2]]) : null) : null;
  const govLinhas = gov ? disputas(sigla, gov, "governador", gov2 ? new Map(gov2.filter((x) => x.d).map((x) => [x.uf, x.d])) : null) : null;
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
const pilula = (l) => `<span class="pp-res ${l.resultado}">${l.resultado === "vitoria" ? "✓ " : ""}${ROTULO[l.resultado]}${l.turno2 && (l.resultado === "vitoria" || l.resultado === "derrota") ? " no 2º turno" : ""}</span>`;
const tile = (valor, rotulo, sub = "", classe = "") => `<div class="pp-tile ${classe}"><strong>${valor}</strong><span>${rotulo}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
const carregando = (rotulo) => `<p class="muted">Carregando ${rotulo}…</p>`;
export const VISOES_PARTIDO = [["maj", "Majoritárias"], ["depf", "Dep. federais"], ["depe", "Dep. estaduais"], ["clausula", "Cláusula"]];

function tabelaMajoritaria(r) {
  const linha = (nome, x) => (x ? `<tr><th scope="row">${nome}</th><td>${x.candidaturas}</td><td><b class="pp-v">${x.vitorias}</b></td><td>${x.segundos}</td><td>${x.derrotas}</td><td>${x.abertas}</td><td>${pct(x.pct)}</td></tr>` : "");
  return `<div class="tab-scroll"><table class="pp-tabela"><tr><th></th><th title="Candidaturas">Cand.</th><th>Vitórias</th><th>2º turno</th><th>Derrotas</th><th>Em aberto</th><th>% válidos</th></tr>
    ${linha("Presidente", r.pres)}${linha("Governador", r.gov)}${linha("Senador", r.sen)}${linha("Total", r.total).replace("<tr>", '<tr class="pp-total">')}</table></div>`;
}

const SIGLA_CARGO = { presidente: "PR", governador: "Gov", senador: "Sen" };
/** Linha compacta (sem foto): sigla do local, candidato, colocação, % e resultado. Toque abre a ficha. */
const linhaCompacta = (l) => `<li class="pp-d ${l.resultado}" data-sq="${esc(l.c.id)}" role="button" tabindex="0" title="Ver ficha de ${esc(l.c.nome)}">
  <span class="sigla">${l.uf === "BR" ? "BR" : l.uf}</span>
  <span class="pp-d-quem"><b>${esc(l.c.nome)}</b><small class="muted">${SIGLA_CARGO[l.cargo]}${l.pos ? ` · ${l.pos}º colocado` : ""}${l.subJudice ? " · sub judice" : ""}${l.turno2 ? ` · ${l.resultado === "vitoria" ? "venceu" : l.resultado === "derrota" ? "perdeu" : "disputa"} o 2º turno (${pct(l.turno2.pct)})` : ""}</small></span>
  <span class="pp-d-num"><strong>${pct(l.pct)}</strong></span></li>`; // o grupo já diz se é vitória, derrota ou 2º turno

/** Todas as candidaturas majoritárias em grupos: vitórias e 2º turno abertos; derrotas e em aberto recolhidos. */
function gruposDisputas(des) {
  const todas = [...(des.pres ?? []), ...(des.gov ?? []), ...(des.sen ?? [])];
  const grupo = (res, titulo, aberto) => {
    const ls = todas.filter((l) => l.resultado === res).sort((a, b) => b.pct - a.pct);
    return ls.length ? `<details class="pp-grupo ${res}"${aberto ? " open" : ""}><summary><b>${titulo}</b><span class="pp-n">${ls.length}</span></summary><ul class="pp-disputas">${ls.map(linhaCompacta).join("")}</ul></details>` : "";
  };
  return grupo("vitoria", "Vitórias", false) + grupo("segundo", "No 2º turno", false) + grupo("aberto", "Em aberto", false) + grupo("derrota", "Derrotas", false);
}

function blocoDeputados(rotulo, dd) {
  if (!dd) return carregando(rotulo.toLowerCase());
  if (!dd.candidatos) return `<p class="muted">O partido não teve candidatos neste cargo.</p>`;
  const linhas = dd.porUf.map((u) => `<tr><td><b>${u.uf}</b></td><td><b class="pp-v">${u.eleitos}</b></td><td>${u.candidatos}</td><td>${fmt(u.votos)}</td><td>${pct(u.pct)}</td><td class="pp-nomes">${u.nomes.map(esc).join(", ") || "–"}</td></tr>`).join("");
  return `<div class="pp-tiles pp-tiles-peq">${tile(dd.eleitos, dd.eleitos === 1 ? "eleito" : "eleitos", dd.oficiais === dd.estados ? "oficial" : "projeção", "eleito")}${tile(dd.candidatos, "candidatos", `${dd.estados} estados`)}${tile(fmt(dd.votosNominais), "votos nominais", `${pct(dd.pctNominais)} dos válidos`)}${dd.federacao ? tile(dd.bancadaFed, "da federação", `${esc(dd.federacao)} · ${pct(dd.pctFed)}`) : ""}</div>
    ${linhas ? `<details class="pp-grupo"><summary><b>Por estado</b><span class="pp-n">${dd.porUf.length}</span></summary><div class="tab-scroll"><table class="pp-tabela pp-uf"><tr><th>UF</th><th>Eleitos</th><th>Cand.</th><th>Votos nominais</th><th>% válidos</th><th>Quem foi eleito</th></tr>${linhas}</table></div></details>` : ""}
    <p class="muted nota">As cadeiras são da federação (ou do partido, se concorreu sozinho); aqui contam os candidatos eleitos do partido.</p>`;
}

/** Tela completa do partido: cabeçalho com o resumo e uma visão por vez (majoritárias, deputados ou cláusula). */
export function blocoPartido(des, seletor = "", visao = "maj") {
  const r = des.resumo, gov = r.gov, sen = r.sen, cl = des.clausula;
  const v = VISOES_PARTIDO.some(([k]) => k === visao) ? visao : "maj";
  const tiles = `<div class="pp-tiles">
    ${tile(gov ? gov.vitorias : "…", "governos", gov ? `${gov.segundos ? `${gov.segundos} no 2º turno · ` : ""}${gov.candidaturas} cand.` : "", "eleito")}
    ${tile(sen ? sen.vitorias : "…", "senadores", sen ? `${sen.candidaturas} candidaturas` : "", "eleito")}
    ${tile(des.depf ? des.depf.eleitos : "…", "dep. federais", des.depf ? `${des.depf.candidatos} candidatos` : "", "eleito")}
    ${tile(des.depe ? des.depe.eleitos : "…", "dep. estaduais", des.depe ? `${des.depe.candidatos} candidatos` : "", "eleito")}
    ${cl ? tile(cl.status === "atingiu" ? "✓" : cl.status === "nao" ? "✕" : "…", "cláusula", cl.status === "atingiu" ? "atingiu" : cl.status === "nao" ? "não atingiu" : "pode atingir", cl.status) : des.depf ? tile("–", "cláusula", "sem dep. federal") : ""}
    ${r.total.candidaturas ? tile(`${r.total.vitorias}×${r.total.derrotas}`, "vitórias × derrotas", "majoritárias", r.total.vitorias >= r.total.derrotas ? "atingiu" : "") : ""}</div>`;
  const abas = `<div class="seg mini seg-rolavel pp-abas" role="tablist" aria-label="Visão do partido">${VISOES_PARTIDO.map(([k, n]) => `<button type="button" role="tab" data-pvisao="${k}" aria-pressed="${k === v}">${n}</button>`).join("")}</div>`;
  const corpo = v === "maj"
    ? ((r.pres || r.gov || r.sen) ? `${tabelaMajoritaria(r)}<p class="pp-saldo">Saldo: <b>${r.total.vitorias}</b> vitória${r.total.vitorias === 1 ? "" : "s"} × <b>${r.total.derrotas}</b> derrota${r.total.derrotas === 1 ? "" : "s"}${r.total.segundos ? ` · ${r.total.segundos} no 2º turno` : ""}${r.total.abertas ? ` · ${r.total.abertas} em aberto` : ""}</p>${gruposDisputas(des)}` : carregando("as eleições majoritárias"))
    : v === "depf" ? blocoDeputados("deputados federais", des.depf)
    : v === "depe" ? blocoDeputados("deputados estaduais", des.depe)
    : `${cl ? `<ul class="cards-estados cards-cl">${cardClausula(cl, des.clausulaFinal)}</ul>` : des.depf ? `<p class="muted">O partido não teve candidatos a deputado federal.</p>` : carregando("a cláusula")}<p class="muted nota">Medida sobre os votos válidos para a Câmara, por regra legal. A federação conta como um só partido.</p>`;
  return `<section class="card pp-topo" style="--cor:${corPartido(des.sigla)}"><div class="pp-cabeca"><span class="chip pp-chip" style="--cor:${corPartido(des.sigla)}">${esc(des.sigla)}</span>${des.federacao ? `<span class="muted">Federação ${esc(des.federacao)}</span>` : ""}${seletor}</div>${tiles}</section>
    <section class="card pp-corpo">${abas}${corpo}</section>`;
}
