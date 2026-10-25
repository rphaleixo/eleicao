// Listas longas: painel recolhido com resumo e "Ver mais 10" (componentes Painel e VerMais do design system).
// A tela se refaz a cada atualização; por isso o estado aberto e o tanto já mostrado ficam guardados aqui.
const abertos = new Set(), limites = new Map();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n).toLocaleString("pt-BR");

/** Painel recolhido por padrão, com o título e um resumo à vista. */
export function painelLista(id, titulo, resumo, corpo) {
  return `<details class="el-painel painel-lista" data-painel-lista="${esc(id)}"${abertos.has(id) ? " open" : ""}><summary><span>${esc(titulo)}<small class="el-apoio">${esc(resumo)}</small></span></summary><div class="el-painel__corpo">${corpo}</div></details>`;
}

/** Quantos itens já se mostram nesta lista (começa em `base`). */
export const limiteDe = (chave, base = 10) => limites.get(chave) ?? base;
export const maisItens = (chave, passo = 10, base = 10) => limites.set(chave, limiteDe(chave, base) + passo);
export const zerarLimites = () => limites.clear();

/** O "Mostrando N de M" com o botão "Ver mais 10" (some quando já se vê tudo). */
export function verMais(chave, mostrados, total, passo = 10) {
  if (total <= mostrados) return "";
  return `<div class="el-vermais"><span>Mostrando <b class="el-num">${fmt(mostrados)}</b> de <b class="el-num">${fmt(total)}</b></span><div class="el-trilho"><i style="width:${Math.min(100, (mostrados / total) * 100)}%"></i></div><button type="button" class="el-botao" data-vermais="${esc(chave)}" data-passo="${passo}">Ver mais ${Math.min(passo, total - mostrados)}</button></div>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d?.matches?.("details[data-painel-lista]")) d.open ? abertos.add(d.dataset.painelLista) : abertos.delete(d.dataset.painelLista);
  }, true);
}
