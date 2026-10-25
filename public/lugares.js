// Opções de um seletor de lugar, em três grupos: Brasil, Regiões (com o Exterior, quando a tela tem) e os 27 Estados em ordem alfabética.
import { UFS } from "./config.js";
import { REGIOES } from "./marcha.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** Valor de uma região no seletor ("r:nordeste"); o Exterior usa o valor do próprio local ("ZZ"). */
export const valorRegiao = (chave) => `r:${chave}`;
export const regiaoDoValor = (valor) => (String(valor).startsWith("r:") && REGIOES[String(valor).slice(2)] ? String(valor).slice(2) : "");

/**
 * @param {{ selecionado:string, brasil?:string, comExterior?:boolean }} o `selecionado` é o valor atual ("", "BR", "r:sul", "ZZ" ou uma sigla)
 */
export function opcoesDeLugar({ selecionado, brasil = "BR", comExterior = true }) {
  const op = (valor, nome) => `<option value="${esc(valor)}"${valor === selecionado ? " selected" : ""}>${esc(nome)}</option>`;
  const regioes = Object.entries(REGIOES).map(([k, r]) => op(valorRegiao(k), r.nome)).join("") + (comExterior ? op("ZZ", "Exterior") : "");
  const estados = Object.entries(UFS).filter(([u]) => u !== "ZZ").sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([u, n]) => op(u, n)).join("");
  return `<optgroup label="Brasil">${op(brasil, "Brasil")}</optgroup><optgroup label="Regiões">${regioes}</optgroup><optgroup label="Estados">${estados}</optgroup>`;
}
