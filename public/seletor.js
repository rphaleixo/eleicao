// Seleção fluida de estado: tira com as siglas, barra fixa com cargos e uma folha de busca.
import { UFS } from "./config.js";
import { REGIOES } from "./marcha.js";

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

/** Tira rolável com as 27 siglas: um toque troca de estado. */
export function tiraEstados(uf, ac) {
  return `<div class="tira" role="group" aria-label="Estado">${Object.keys(UFS).map((u) =>
    `<button type="button" data-pick-uf="${u}" aria-pressed="${u === uf}" title="${esc(UFS[u])}">${u}<i class="ponto ${pontoDe(ac, u)}"></i></button>`).join("")}</div>`;
}

/** Barra que acompanha a rolagem: botão do estado (abre a busca) e os cargos. */
export function barraEstado(uf, cargo) {
  return `<div class="barra-estado"><button type="button" class="be-estado" data-abrir-seletor aria-haspopup="dialog"><strong>${uf}</strong><span>${esc(UFS[uf])}</span><i aria-hidden="true">⌄</i></button>
    <div class="be-cargos" role="tablist" aria-label="Eleição">${CARGOS_BARRA.map(([id, nome]) => `<button type="button" role="tab" data-cargo="${id}" aria-selected="${id === cargo}">${nome}</button>`).join("")}</div></div>`;
}

/** Conteúdo da folha de seleção: busca e estados agrupados por região. */
export function folhaEstados(uf) {
  const grupos = Object.values(REGIOES).map((r) => `<h3>${r.nome}</h3><div class="grade-ufs">${r.ufs.slice().sort((a, b) => UFS[a].localeCompare(UFS[b], "pt-BR")).map((u) =>
    `<button type="button" data-escolher-uf="${u}" aria-pressed="${u === uf}"><b>${u}</b><span>${esc(UFS[u])}</span></button>`).join("")}</div>`).join("");
  return `<header class="folha-topo"><h2>Escolha o estado</h2><button type="button" class="ficha-fechar" data-fechar-seletor aria-label="Fechar">×</button></header>
    <input type="search" id="busca-estado" placeholder="Digite o nome ou a sigla" autocomplete="off" aria-label="Buscar estado">${grupos}<p class="muted vazio-busca" hidden>Nenhum estado encontrado.</p>`;
}
