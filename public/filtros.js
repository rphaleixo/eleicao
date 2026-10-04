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
export function barraFiltros(filtros, { escopo = "filtros", comSegundo = true, exterior = false, statusTodos = "Todas", ordem = null } = {}) {
  const lista = (attr, rotulo, itens, atual) => `<label class="f-sel"><span>${rotulo}</span><select ${attr} data-f-escopo="${escopo}" aria-label="${rotulo}">${itens.map(([k, n]) => `<option value="${k}"${k === atual ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const regioes = [["", "Todas"], ...Object.entries(REGIOES).map(([k, r]) => [k, r.nome]), ...(exterior ? [["exterior", "Exterior"]] : [])];
  const status = [["", statusTodos], ["definida", STATUS.definida], ["aberta", STATUS.aberta], ...(comSegundo ? [["segundo", STATUS.segundo]] : [])];
  const doRegiao = filtros.regiao && REGIOES[filtros.regiao] ? REGIOES[filtros.regiao].ufs : Object.keys(UFS);
  const ufs = [["", "Todos"], ...doRegiao.slice().sort((x, y) => UFS[x].localeCompare(UFS[y], "pt-BR")).map((u) => [u, UFS[u]])];
  const ativo = !!(filtros.regiao || filtros.uf || filtros.status);
  const ord = ordem ? `<label class="f-sel"><span>Ordem</span><select data-ordem-sel aria-label="Ordenar">${[["az", "A–Z"], ["pct", "% apurado"]].map(([k, n]) => `<option value="${k}"${k === ordem ? " selected" : ""}>${n}</option>`).join("")}</select></label>` : "";
  return `<div class="filtros-estados" role="group" aria-label="Filtros">${lista("data-f-regiao", "Região", regioes, filtros.regiao)}${lista("data-f-status", "Situação", status, filtros.status)}${lista("data-f-uf", "Estado", ufs, filtros.uf)}${ord}${ativo ? `<button type="button" class="f-limpar" data-f-limpar data-f-escopo="${escopo}">Limpar</button>` : ""}</div>`;
}
