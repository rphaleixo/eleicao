// Mapa do Brasil por estado, colorido pelo candidato (ou partido) que está na frente.
import { VIEWBOX, ESTADOS } from "./mapa-brasil.js";
import { UFS } from "./config.js";

import { pct as pctTxt } from "./formato.js";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SEM_LIDER = "var(--barra)";

/** Força da cor pela apuração: 22% (começando) a 100% (apuração completa). */
export const alfaApuracao = (pct) => Number((0.22 + 0.78 * Math.min(100, Math.max(0, Number(pct) || 0)) / 100).toFixed(2));
const estilo = (l) => (l ? `fill:${l.cor};fill-opacity:${alfaApuracao(l.apurado ?? 100)}` : `fill:${SEM_LIDER}`);

/**
 * @param {Record<string,{cor:string, quem:string}|null>} lideres líder de cada estado (null = sem votos)
 * @param {{selecionado?:string, destaque?:Set<string>|null}} o destaque: só esses estados ficam em cor cheia
 */
export function mapaBrasil(lideres, { selecionado = "", destaque = null } = {}) {
  const caminhos = Object.entries(ESTADOS).map(([uf, { d }]) => {
    const l = lideres[uf];
    const apagado = destaque && !destaque.has(uf);
    return `<path class="mapa-uf${uf === selecionado ? " sel" : ""}${apagado ? " apagado" : ""}" data-mapa-uf="${uf}" d="${d}" style="${estilo(l)}" tabindex="0" role="button"
      aria-label="${esc(UFS[uf])}${l ? `: ${esc(l.quem)} na frente${l.apurado != null ? `, ${pctTxt(l.apurado)} apurado` : ""}` : ": sem votos apurados"}"><title>${esc(UFS[uf])}${l ? ` · ${esc(l.quem)}${l.apurado != null ? ` · ${pctTxt(l.apurado)} apurado` : ""}` : ""}</title></path>`;
  }).join("");
  const siglas = Object.entries(ESTADOS).map(([uf, { c }]) => `<text class="mapa-sigla" x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central">${uf}</text>`).join("");
  return `<svg class="mapa-br" viewBox="${VIEWBOX}" role="group" aria-label="Mapa do Brasil por estado">${caminhos}${siglas}</svg>`;
}

export const COR_SEGUNDO_TURNO = "var(--sit-segundo)";

/**
 * Legenda: de quem é a cor de cada estado. Os "segundo turno" e "sem votos" vêm por último.
 * @param {{cor:string, quem:string, n:number, segundo?:boolean}[]} itens
 * @param {{semVotos?:number, nota?:string}} extra
 */
export function legendaMapa(itens, { semVotos = 0, nota = "", unidade = ["estado", "estados"] } = {}) {
  if (!itens.length && !semVotos) return `<p class="muted">Nenhum estado com votos apurados ainda.</p>`;
  const item = (cor, nome, n, extraClasse = "") => `<li class="${extraClasse}"><i style="background:${cor}"></i><span>${esc(nome)}</span><b>${n} ${n === 1 ? unidade[0] : unidade[1]}</b></li>`;
  const partidos = itens.filter((i) => !i.segundo).sort((a, b) => b.n - a.n || a.quem.localeCompare(b.quem, "pt-BR"));
  const segundo = itens.find((i) => i.segundo);
  const escala = `<div class="escala-apuracao" aria-label="Quanto mais forte a cor, mais seções apuradas"><span>0%</span><i></i><span>100% apurado</span></div>`;
  return `${escala}<ul class="legenda-mapa">${partidos.map((i) => item(i.cor, i.quem, i.n)).join("")}${segundo ? item(segundo.cor, "2º turno", segundo.n, "leg-segundo") : ""}${semVotos ? item(SEM_LIDER, "Sem votos apurados", semVotos) : ""}</ul>${nota ? `<p class="muted nota">${nota}</p>` : ""}`;
}

/** Conta em quantos estados cada líder está na frente. */
export function contarLideres(lideres) {
  const mapa = new Map();
  for (const l of Object.values(lideres)) {
    if (!l) continue;
    const m = mapa.get(l.quem) ?? { cor: l.cor, quem: l.quem, n: 0, segundo: !!l.segundo };
    m.n++; mapa.set(l.quem, m);
  }
  return [...mapa.values()];
}

/**
 * Mapa dos municípios de um estado, colorido por quem lidera em cada um.
 * @param {{viewBox:string, caminhos:Map<string,string>}} malha desenho do IBGE
 * @param {Map<string,{cor:string, quem:string, nome:string}>} lideres líder de cada município, pelo código do IBGE
 * @param {Map<string,string>} nomes nome de cada município, pelo código do IBGE
 */
export function mapaMunicipal(malha, lideres, nomes, selecionado = "") {
  const caminhos = [...malha.caminhos].map(([ibge, d]) => {
    const l = lideres.get(ibge), nome = nomes.get(ibge) ?? ibge;
    return `<path class="mun${ibge === selecionado ? " sel" : ""}" data-mun-ibge="${ibge}" d="${d}" style="${estilo(l)}" tabindex="0" role="button"
      aria-label="${esc(nome)}${l ? `: ${esc(l.quem)} na frente${l.apurado != null ? `, ${pctTxt(l.apurado)} apurado` : ""}` : ": sem votos apurados"}"><title>${esc(nome)}${l ? ` · ${esc(l.quem)}${l.apurado != null ? ` · ${pctTxt(l.apurado)} apurado` : ""}` : ""}</title></path>`;
  }).join("");
  return `<svg class="mapa-mun" viewBox="${malha.viewBox}" role="group" aria-label="Mapa dos municípios"><g transform="scale(0.0001,-0.0001)">${caminhos}</g></svg>`;
}
