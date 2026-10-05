// Gráfico de barras editável: o "não voto", cada partido/federação que fez cadeira no estado e os demais votos agrupados.
import { corPartido } from "./cores.js";
import { fmt, pct } from "./formato.js";
import { naoVoto } from "./base.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const METRICAS = [["total", "Total"], ["nominais", "Candidatos"], ["legenda", "Legenda"]];
export const ORDENS = [["votos", "Votos"], ["cadeiras", "Cadeiras"], ["az", "A–Z"]];

/**
 * As barras do estado. Percentual sobre o total de votos de partidos mais o "não voto", para as barras serem comparáveis entre si.
 * @param {object} d resultado do estado  @param {object} dist distribuição de cadeiras
 * @param {{metrica?:string, ordem?:string, semSubJudice?:boolean}} o
 */
export function barrasPartidos(d, dist, { metrica = "total", ordem = "votos", semSubJudice = false } = {}) {
  const cadeiras = new Map(dist.linhas.map((l) => [l.sigla, l.vagas]));
  const valor = (p) => {
    const nom = Math.max(0, (p.votosNominais || 0) - (semSubJudice ? p.votosSJ || 0 : 0)), leg = p.votosLegenda || 0;
    return metrica === "nominais" ? nom : metrica === "legenda" ? leg : nom + leg;
  };
  const totalDe = (p) => Math.max(0, (p.votosNominais || 0) - (semSubJudice ? p.votosSJ || 0 : 0)) + (p.votosLegenda || 0);
  const nv = naoVoto(d);
  const base = d.partidos.reduce((s, p) => s + totalDe(p), 0) + (nv?.soma || 0);
  const p100 = (v) => (base > 0 ? (v / base) * 100 : 0);
  const itens = [];
  let outros = 0, nOutros = 0;
  for (const p of d.partidos) {
    const v = valor(p);
    if ((cadeiras.get(p.sigla) || 0) > 0) itens.push({ id: p.sigla, rotulo: p.sigla, votos: v, pct: p100(v), vagas: cadeiras.get(p.sigla), cor: corPartido(p.sigla), tipo: "partido" });
    else if (totalDe(p) > 0) { outros += v; nOutros++; }
  }
  if (nOutros) itens.push({ id: "__outros", rotulo: "Demais partidos", detalhe: `${nOutros} sem cadeira`, votos: outros, pct: p100(outros), vagas: 0, cor: "#8a94a6", tipo: "outros" });
  if (nv) itens.push({ id: "__naovoto", rotulo: "Não voto", detalhe: "brancos, nulos e abstenções", votos: nv.soma, pct: p100(nv.soma), vagas: 0, cor: "#5b6577", tipo: "nv" });
  const fixos = (x) => (x.tipo === "partido" ? 0 : 1);
  const cmp = ordem === "az" ? (a, b) => fixos(a) - fixos(b) || a.rotulo.localeCompare(b.rotulo, "pt-BR")
    : ordem === "cadeiras" ? (a, b) => fixos(a) - fixos(b) || b.vagas - a.vagas || b.votos - a.votos
    : (a, b) => b.votos - a.votos;
  return { itens: itens.sort(cmp), base };
}

const seg = (attr, valor, opcoes) => `<div class="seg mini" role="group">${opcoes.map(([k, n]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === valor}">${n}</button>`).join("")}</div>`;

/** O cartão do gráfico, com os controles: o que medir, a ordem e quais barras mostrar. */
export function blocoGraficoPartidos(r, { metrica, ordem, ocultos, titulo }) {
  if (!r.itens.length) return "";
  const vis = r.itens.filter((i) => !ocultos.has(i.id));
  const max = Math.max(1, ...vis.map((i) => i.votos));
  const linhas = vis.map((i) => `<li class="gp-linha" style="--cor:${i.cor}">
    <span class="gp-rotulo"><b>${esc(i.rotulo)}</b>${i.vagas ? ` <small class="muted">${i.vagas} ${i.vagas === 1 ? "cadeira" : "cadeiras"}</small>` : i.detalhe ? ` <small class="muted">${esc(i.detalhe)}</small>` : ""}</span>
    <span class="gp-trilho"><i style="width:${Math.max(0.4, (i.votos / max) * 100)}%"></i></span>
    <span class="gp-valor">${fmt(i.votos)} · ${pct(i.pct)}</span></li>`).join("");
  const chips = r.itens.map((i) => `<button type="button" class="gp-chip" data-gp-alt="${esc(i.id)}" aria-pressed="${!ocultos.has(i.id)}" style="--cor:${i.cor}">${esc(i.rotulo)}</button>`).join("");
  return `<section class="card"><div class="titulo-cadeiras"><h2>${esc(titulo)}</h2><span class="muted">${vis.length} de ${r.itens.length} barras</span></div>
    <p class="muted">Compare o “não voto”, os partidos e federações que elegeram deputados no estado e todos os demais votos juntos. Cada rótulo traz os votos e o % do total (votos de partidos mais não voto = ${fmt(r.base)}).</p>
    <div class="gp-controles"><div><span class="gp-leg">Votos</span>${seg("data-gp-metrica", metrica, METRICAS)}</div><div><span class="gp-leg">Ordem</span>${seg("data-gp-ordem", ordem, ORDENS)}</div></div>
    <ul class="gp-barras">${linhas || `<li class="muted">Nenhuma barra selecionada.</li>`}</ul>
    <div class="gp-escolha"><span class="gp-leg">Toque para mostrar ou esconder barras</span><div class="gp-chips">${chips}<button type="button" class="gp-chip gp-tudo" data-gp-alt="__todas">Mostrar todas</button></div></div></section>`;
}
