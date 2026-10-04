// Mapa do Brasil por estado, colorido pelo candidato (ou partido) que está na frente.
import { VIEWBOX, ESTADOS } from "./mapa-brasil.js";
import { UFS } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SEM_LIDER = "var(--barra)";

/**
 * @param {Record<string,{cor:string, quem:string}|null>} lideres líder de cada estado (null = sem votos)
 * @param {{selecionado?:string, destaque?:Set<string>|null}} o destaque: só esses estados ficam em cor cheia
 */
export function mapaBrasil(lideres, { selecionado = "", destaque = null } = {}) {
  const caminhos = Object.entries(ESTADOS).map(([uf, { d }]) => {
    const l = lideres[uf];
    const apagado = destaque && !destaque.has(uf);
    return `<path class="mapa-uf${uf === selecionado ? " sel" : ""}${apagado ? " apagado" : ""}" data-mapa-uf="${uf}" d="${d}" style="fill:${l?.cor ?? SEM_LIDER}" tabindex="0" role="button"
      aria-label="${esc(UFS[uf])}${l ? `: ${esc(l.quem)} na frente` : ": sem votos apurados"}"><title>${esc(UFS[uf])}${l ? ` · ${esc(l.quem)}` : ""}</title></path>`;
  }).join("");
  const siglas = Object.entries(ESTADOS).map(([uf, { c }]) => `<text class="mapa-sigla" x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central">${uf}</text>`).join("");
  return `<svg class="mapa-br" viewBox="${VIEWBOX}" role="group" aria-label="Mapa do Brasil por estado">${caminhos}${siglas}</svg>`;
}

/** Legenda: quem lidera em quantos estados. @param {{cor:string, quem:string, n:number}[]} itens */
export function legendaMapa(itens) {
  if (!itens.length) return `<p class="muted">Nenhum estado com votos apurados ainda.</p>`;
  return `<ul class="legenda-mapa">${itens.sort((a, b) => b.n - a.n || a.quem.localeCompare(b.quem, "pt-BR")).map((i) =>
    `<li><i style="background:${i.cor}"></i><span>${esc(i.quem)}</span><b>${i.n} ${i.n === 1 ? "estado" : "estados"}</b></li>`).join("")}</ul>`;
}

/** Conta em quantos estados cada líder está na frente. */
export function contarLideres(lideres) {
  const mapa = new Map();
  for (const l of Object.values(lideres)) {
    if (!l) continue;
    const m = mapa.get(l.quem) ?? { cor: l.cor, quem: l.quem, n: 0 };
    m.n++; mapa.set(l.quem, m);
  }
  return [...mapa.values()];
}
