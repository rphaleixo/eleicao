// Comparar dois candidatos estado a estado: diferença em pontos percentuais e em votos, com os dois em destaque,
// a soma dos demais candidatos e o "não voto" (brancos + nulos + abstenções). Base: todos os eleitores aptos das seções apuradas.
import { UFS } from "./config.js";
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { naoVoto } from "./base.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const ORDENS = {
  vantagemA: "Maior vantagem do 1º candidato",
  vantagemB: "Maior vantagem do 2º candidato",
  margem: "Menor diferença (disputa mais apertada)",
  maiorMargem: "Maior diferença",
  az: "Estado (A–Z)",
  apurado: "% apurado",
};

/** Números de um local para o par escolhido; null se não houver apuração com eleitorado. */
export function linhaComparacao(uf, d, idA, idB) {
  const nv = naoVoto(d);
  if (!d || !nv) return null;
  const votos = (id) => d.candidatos.find((c) => c.id === id)?.votos ?? 0;
  const a = votos(idA), b = votos(idB);
  const total = d.candidatos.reduce((t, c) => t + c.votos, 0), outros = Math.max(0, total - a - b), base = nv.base;
  const p = (n) => (n / base) * 100;
  return { uf, base, a, b, outros, naoVoto: nv.soma, pctA: p(a), pctB: p(b), pctOutros: p(outros), pctNaoVoto: p(nv.soma), difPP: p(a) - p(b), difVotos: a - b, apurado: d.pctSecoes };
}

export function ordenarComparacao(linhas, ordem = "vantagemA") {
  const nome = (l) => UFS[l.uf] ?? l.uf;
  const cmp = {
    vantagemA: (x, y) => y.difPP - x.difPP,
    vantagemB: (x, y) => x.difPP - y.difPP,
    margem: (x, y) => Math.abs(x.difPP) - Math.abs(y.difPP),
    maiorMargem: (x, y) => Math.abs(y.difPP) - Math.abs(x.difPP),
    az: (x, y) => nome(x).localeCompare(nome(y), "pt-BR"),
    apurado: (x, y) => y.apurado - x.apurado,
  }[ordem] ?? (() => 0);
  return linhas.slice().sort((x, y) => cmp(x, y) || nome(x).localeCompare(nome(y), "pt-BR"));
}

const sinal = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");
const ppTxt = (n) => `${sinal(n)}${pct(Math.abs(n)).replace("%", " p.p.")}`;

function barra(l, corA, corB) {
  const seg = (v, estilo, rot) => (v > 0 ? `<i style="width:${v}%;${estilo}" title="${rot}: ${pct(v)}"></i>` : "");
  return `<span class="cp-barra" role="img" aria-label="Distribuição dos aptos apurados">${seg(l.pctA, `background:${corA}`, "1º candidato")}${seg(l.pctB, `background:${corB}`, "2º candidato")}${seg(l.pctOutros, "background:var(--muted);opacity:.55", "Demais candidatos")}${seg(l.pctNaoVoto, "background:repeating-linear-gradient(45deg,var(--barra) 0 3px,var(--muted) 3px 4.5px)", "Não voto")}</span>`;
}

function linhaHtml(l, rotulo, destaque, nomeA, nomeB, corA, corB, extra = "") {
  const lider = l.difPP === 0 ? "" : l.difPP > 0 ? "a" : "b";
  return `<li class="cp-linha${destaque ? " cp-total" : ""}" ${destaque ? "" : `data-uf="${l.uf}" role="button" tabindex="0"`}>
    <span class="cp-nome">${destaque ? "" : `<span class="sigla">${l.uf}</span>`}<b>${esc(rotulo)}</b><small class="muted">${pct(l.apurado)} apurado</small>${extra}</span>
    ${barra(l, corA, corB)}
    <span class="cp-nums">
      <span class="cp-a${lider === "a" ? " lidera" : ""}" style="--cor:${corA}"><small>${esc(nomeA)}</small><strong>${pct(l.pctA)}</strong></span>
      <span class="cp-b${lider === "b" ? " lidera" : ""}" style="--cor:${corB}"><small>${esc(nomeB)}</small><strong>${pct(l.pctB)}</strong></span>
      <span class="cp-dif ${lider}"><small>Diferença</small><strong>${ppTxt(l.difPP)}</strong><em>${sinal(l.difVotos)}${fmt(Math.abs(l.difVotos))} votos</em></span>
      <span class="cp-outros"><small>Demais candidatos</small><strong>${pct(l.pctOutros)}</strong></span>
      <span class="cp-nv"><small>Não voto</small><strong>${pct(l.pctNaoVoto)}</strong></span></span></li>`;
}

/**
 * @param {{titulo:string, candidatos:{id:string,nome:string,partido:string}[], local:{rotulo:string, uf:string, d:object}, itens:{uf:string,d:object}[], cmp:{a:string,b:string,ordem:string}}} o
 */
export function blocoComparar({ candidatos, local, itens, cmp }) {
  const ids = candidatos.map((c) => c.id);
  const a = ids.includes(cmp.a) ? cmp.a : ids[0], b = ids.includes(cmp.b) && cmp.b !== a ? cmp.b : ids.find((i) => i !== a);
  const cA = candidatos.find((c) => c.id === a), cB = candidatos.find((c) => c.id === b);
  if (!cA || !cB) return "";
  const corA = corPartido(cA.partido), corB = corPartido(cB.partido);
  const opt = (sel, outro) => candidatos.map((c) => `<option value="${esc(c.id)}"${c.id === sel ? " selected" : ""}${c.id === outro ? " disabled" : ""}>${esc(c.nome)} (${esc(c.partido)})</option>`).join("");
  const linhas = ordenarComparacao(itens.map(({ uf, d }) => linhaComparacao(uf, d, a, b)).filter(Boolean), cmp.ordem);
  const total = linhaComparacao(local.uf, local.d, a, b);
  const curto = (c) => c.nome.split(" ")[0];
  return `<section class="card"><h2>Comparar candidatos</h2>
    <p class="muted">Diferença entre dois candidatos em cada estado. A base é o total de eleitores aptos das seções apuradas, então os quatro pedaços somam 100%: os dois candidatos, os demais candidatos e o “não voto” (brancos + nulos + abstenções).</p>
    <div class="cp-controles">
      <label class="f-sel"><span>1º candidato</span><select data-cmp-a aria-label="Primeiro candidato">${opt(a, b)}</select></label>
      <label class="f-sel"><span>2º candidato</span><select data-cmp-b aria-label="Segundo candidato">${opt(b, a)}</select></label>
      <label class="f-sel cp-ordem"><span>Ordenar por</span><select data-cmp-ordem aria-label="Ordenar">${Object.entries(ORDENS).map(([k, n]) => `<option value="${k}"${k === cmp.ordem ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
    <p class="cp-legenda"><span><i style="background:${corA}"></i>${esc(cA.nome)}</span><span><i style="background:${corB}"></i>${esc(cB.nome)}</span><span><i class="cp-l-outros"></i>Demais candidatos</span><span><i class="cp-l-nv"></i>Não voto</span></p>
    <ul class="cp-lista">${total ? linhaHtml(total, local.rotulo, true, curto(cA), curto(cB), corA, corB) : ""}${linhas.map((l) => linhaHtml(l, UFS[l.uf] ?? (l.uf === "ZZ" ? "Exterior" : l.uf), false, curto(cA), curto(cB), corA, corB)).join("")}</ul></section>`;
}

// ---------- Governadores: cada estado tem os seus candidatos ----------
const curtoNome = (n) => String(n ?? "").trim().split(/\s+/).slice(0, 2).join(" ");
const maisVotado = (cs, filtro = () => true) => cs.filter((c) => c.votos > 0 && filtro(c)).sort((a, b) => b.votos - a.votos)[0] ?? null;

/** O par comparado em um estado: "top2" = os dois mais votados; "partidos" = o mais votado de cada partido escolhido. */
export function parDoEstado(d, modo, pa = "", pb = "") {
  const cs = (d?.candidatos ?? []).filter((c) => c.elegivel && !c.subJudice);
  if (modo === "partidos") {
    const a = maisVotado(cs, (c) => c.partido === pa), b = maisVotado(cs, (c) => c.partido === pb);
    return a && b && a.id !== b.id ? [a, b] : null;
  }
  const ord = cs.filter((c) => c.votos > 0).sort((x, y) => y.votos - x.votos);
  return ord.length >= 2 ? [ord[0], ord[1]] : null;
}

export const ORDENS_GOVERNO = { margem: "Menor diferença (disputa mais apertada)", maiorMargem: "Maior diferença", vantagemA: "Maior vantagem do 1º partido", vantagemB: "Maior vantagem do 2º partido", az: "Estado (A–Z)", apurado: "% apurado" };

/** Governadores: diferença entre os dois mais votados (ou entre dois partidos) em cada estado. `partidos` = [{sigla, n}] com candidatos a governador. */
export function blocoCompararGoverno({ lista, cmp, partidos }) {
  const modo = cmp.modo === "partidos" ? "partidos" : "top2";
  const maisComuns = partidos.slice().sort((a, b) => (b.votos ?? b.n) - (a.votos ?? a.n) || a.sigla.localeCompare(b.sigla, "pt-BR")); // padrão: os dois partidos com mais votos para governador
  const pa = partidos.some((p) => p.sigla === cmp.pa) ? cmp.pa : maisComuns[0]?.sigla, pb = partidos.some((p) => p.sigla === cmp.pb && p.sigla !== pa) ? cmp.pb : maisComuns.find((p) => p.sigla !== pa)?.sigla;
  const ordensValidas = modo === "partidos" ? Object.keys(ORDENS_GOVERNO) : ["margem", "maiorMargem", "az", "apurado"];
  const ordem = ordensValidas.includes(cmp.ordem) ? cmp.ordem : modo === "partidos" ? "vantagemA" : "margem";
  const linhas = [];
  for (const { uf, d } of lista ?? []) {
    const par = d && parDoEstado(d, modo, pa, pb);
    const l = par && linhaComparacao(uf, d, par[0].id, par[1].id);
    if (l) linhas.push({ ...l, A: par[0], B: par[1] });
  }
  const ordenadas = ordenarComparacao(linhas, ordem).map((l) => linhas.find((x) => x.uf === l.uf));
  const optP = (sel, outro) => partidos.map((p) => `<option value="${esc(p.sigla)}"${p.sigla === sel ? " selected" : ""}${p.sigla === outro ? " disabled" : ""}>${esc(p.sigla)} (${p.n})</option>`).join("");
  const itens = ordenadas.map((l) => linhaHtml(l, UFS[l.uf] ?? l.uf, false, curtoNome(l.A.nome), curtoNome(l.B.nome), corPartido(l.A.partido), corPartido(l.B.partido), `<small class="cp-par">${esc(l.A.partido)} × ${esc(l.B.partido)}</small>`)).join("");
  return `<section class="card"><h2>Comparar candidatos</h2>
    <p class="muted">${modo === "partidos" ? `Diferença entre os candidatos de ${esc(pa)} e ${esc(pb)} nos estados em que os dois disputam.` : "Diferença entre os dois candidatos mais votados de cada estado."} A base é o total de eleitores aptos das seções apuradas: os quatro pedaços somam 100% (os dois candidatos, os demais candidatos e o “não voto”: brancos + nulos + abstenções).</p>
    <div class="cp-controles">
      <label class="f-sel"><span>Comparar</span><select data-cmpg-modo aria-label="Tipo de comparação"><option value="top2"${modo === "top2" ? " selected" : ""}>Os dois mais votados</option><option value="partidos"${modo === "partidos" ? " selected" : ""}>Partido × partido</option></select></label>
      ${modo === "partidos" ? `<label class="f-sel"><span>1º partido</span><select data-cmpg-pa aria-label="Primeiro partido">${optP(pa, pb)}</select></label><label class="f-sel"><span>2º partido</span><select data-cmpg-pb aria-label="Segundo partido">${optP(pb, pa)}</select></label>` : ""}
      <label class="f-sel cp-ordem"><span>Ordenar por</span><select data-cmpg-ordem aria-label="Ordenar">${ordensValidas.map((k) => `<option value="${k}"${k === ordem ? " selected" : ""}>${ORDENS_GOVERNO[k]}</option>`).join("")}</select></label></div>
    ${itens ? `<ul class="cp-lista">${itens}</ul>` : `<p class="muted">Nenhum estado com esse par de candidatos ainda.</p>`}</section>`;
}
