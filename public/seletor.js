// Seleção fluida de estado: tira com as siglas, barra fixa com cargos e uma folha de busca.
import { UFS } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const CARGOS_BARRA = [["resumo", "Resumo"], ["governador", "Governador"], ["senador", "Senador"], ["dep-federal", "Dep. Federal"], ["dep-estadual", "Dep. Estadual"], ["presidente", "Presidente"]];

/** Estados cujo nome ou sigla começa com o texto digitado (sem acento, sem maiúsculas). */
export function filtrarEstados(texto) {
  const t = semAcento(texto).trim();
  const achados = Object.keys(UFS).filter((uf) => !t || semAcento(UFS[uf]).includes(t) || uf.toLowerCase().startsWith(t));
  return achados.sort((a, b) => (b.toLowerCase() === t) - (a.toLowerCase() === t)); // sigla exata vem primeiro
}

const pontoDe = (ac, uf) => { const a = ac?.ufs?.[uf.toLowerCase()]?.andamento; return a === "f" ? "f" : a === "p" ? "p" : "n"; };
const ORDEM = Object.keys(UFS).sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR"));

/** Estado anterior (-1) ou seguinte (+1) em ordem alfabética, dando a volta no fim da lista. */
export const vizinho = (uf, passo) => ORDEM[(ORDEM.indexOf(uf) + passo + ORDEM.length) % ORDEM.length];

/** Posição de cada estado no mapa de blocos do Brasil: [coluna, linha]. */
export const MAPA = {
  RR: [1, 0], AP: [3, 0],
  AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1],
  AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2],
  MS: [2, 3], GO: [3, 3], DF: [4, 3], BA: [5, 3], AL: [6, 3],
  SP: [2, 4], MG: [3, 4], ES: [4, 4], SE: [6, 4],
  PR: [2, 5], RJ: [3, 5],
  SC: [2, 6], RS: [2, 7],
};

/**
 * Barra fixa: estado anterior/seguinte, botão do estado (abre o mapa) e os cargos.
 * Tocar no botão do estado abre o mapa; as setas percorrem os estados em ordem alfabética.
 */
export function barraEstado(uf, cargo) {
  return `<div class="barra-estado"><div class="be-troca" role="group" aria-label="Trocar de estado">
      <button type="button" class="be-seta" data-vizinho="-1" aria-label="Estado anterior: ${esc(UFS[vizinho(uf, -1)])}">‹</button>
      <button type="button" class="be-estado" data-abrir-seletor aria-haspopup="dialog" aria-label="Escolher estado. Atual: ${esc(UFS[uf])}"><strong>${uf}</strong><span>${esc(UFS[uf])}</span></button>
      <button type="button" class="be-seta" data-vizinho="1" aria-label="Próximo estado: ${esc(UFS[vizinho(uf, 1)])}">›</button></div>
    <div class="be-cargos" role="tablist" aria-label="Eleição">${CARGOS_BARRA.map(([id, nome]) => `<button type="button" role="tab" data-cargo="${id}" aria-selected="${id === cargo}">${nome}</button>`).join("")}</div></div>`;
}

/** Conteúdo da folha: busca e o mapa de blocos do Brasil (um toque escolhe o estado). */
export function folhaEstados(uf, ac) {
  const blocos = Object.entries(MAPA).map(([u, [c, l]]) =>
    `<button type="button" class="tile" data-escolher-uf="${u}" style="grid-column:${c + 1};grid-row:${l + 1}" aria-pressed="${u === uf}" title="${esc(UFS[u])}"><b>${u}</b><i class="ponto ${pontoDe(ac, u)}"></i></button>`).join("");
  return `<header class="folha-topo"><h2>Escolha o estado</h2><button type="button" class="ficha-fechar" data-fechar-seletor aria-label="Fechar">×</button></header>
    <input type="search" id="busca-estado" placeholder="Buscar estado" autocomplete="off" aria-label="Buscar estado">
    <div class="mapa-brasil" role="group" aria-label="Mapa do Brasil">${blocos}</div>
    <p class="muted nome-estado-mapa" id="nome-estado-mapa" aria-live="polite">${esc(UFS[uf])}</p>
    <ul class="lista-busca" hidden></ul>`;
}
