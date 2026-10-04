// Filtros de região, estado e situação da eleição, usados em todas as listas "por estado".
import { UFS } from "./config.js";
import { REGIOES, regiaoDe } from "./marcha.js";
import { situacaoEleicao } from "./situacao.js";

export const STATUS = { definida: "Eleição definida", aberta: "Eleição em aberto", segundo: "2º turno" };
export const filtrosVazios = () => ({ regiao: "", uf: "", status: "" });

/** Situação da eleição de um estado: definida, em aberto ou 2º turno. */
export function statusEleicao(d) {
  const sit = situacaoEleicao(d);
  return sit === "eleito" ? "definida" : sit === "segundo" ? "segundo" : "aberta";
}

/** Quais estados passam pelos filtros. `statusDe(uf)` devolve o status do estado ("definida", "aberta" ou "segundo"). */
export function filtrarUfs(ufs, { regiao = "", uf = "", status = "" } = {}, statusDe = () => "aberta") {
  return ufs.filter((u) => {
    if (regiao && regiaoDe(u) !== regiao) return false;
    if (uf && u !== uf) return false;
    if (status && statusDe(u) !== status) return false;
    return true;
  });
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Barra de filtros. `escopo` identifica de quem são os filtros (data-f-escopo) e `comSegundo` mostra o 2º turno.
 * Regiões e status são botões; o estado é uma lista (limitada à região escolhida).
 */
export function barraFiltros(filtros, { escopo = "filtros", comSegundo = true, exterior = false, statusTodos = "Todas" } = {}) {
  const b = (attr, valor, atual, nome) => `<button type="button" ${attr}="${valor}" data-f-escopo="${escopo}" aria-pressed="${atual === valor}">${nome}</button>`;
  const regioes = [["", "Todas"], ...Object.entries(REGIOES).map(([k, r]) => [k, r.nome]), ...(exterior ? [["exterior", "Exterior"]] : [])];
  const status = [["", statusTodos], ["definida", STATUS.definida], ["aberta", STATUS.aberta], ...(comSegundo ? [["segundo", STATUS.segundo]] : [])];
  const doRegiao = filtros.regiao && REGIOES[filtros.regiao] ? REGIOES[filtros.regiao].ufs : Object.keys(UFS);
  const opcoes = doRegiao.slice().sort((x, y) => UFS[x].localeCompare(UFS[y], "pt-BR")).map((u) => `<option value="${u}"${u === filtros.uf ? " selected" : ""}>${esc(UFS[u])}</option>`).join("");
  return `<div class="filtros-estados" role="group" aria-label="Filtros">
    <div class="chips" role="group" aria-label="Região">${regioes.map(([k, n]) => b("data-f-regiao", k, filtros.regiao, n)).join("")}</div>
    <div class="chips" role="group" aria-label="Situação da eleição">${status.map(([k, n]) => b("data-f-status", k, filtros.status, n)).join("")}</div>
    <label class="f-uf">Estado<select data-f-uf data-f-escopo="${escopo}" aria-label="Filtrar por estado"><option value="">Todos os estados</option>${opcoes}</select></label></div>`;
}
