// Ajustar mapa: painel recolhido com os controles que quase ninguém troca (componente AjusteMapa do design system).
// A tela se refaz a cada atualização; por isso o estado aberto/fechado fica guardado aqui e volta junto com o HTML.
const abertos = new Set();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** @param {string} id nome do painel  @param {string} resumo valores ativos, legíveis sem abrir  @param {string} corpo HTML dos controles */
export function ajusteMapa(id, resumo, corpo) {
  return `<details class="el-ajuste" data-ajuste="${esc(id)}"${abertos.has(id) ? " open" : ""}><summary>Ajustar mapa <span class="el-apoio">${esc(resumo)}</span></summary><div>${corpo}</div></details>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d?.matches?.("details[data-ajuste]")) d.open ? abertos.add(d.dataset.ajuste) : abertos.delete(d.dataset.ajuste);
  }, true);
}
