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

/** Segmento de opções com 44px (Abas do design system em modo filtro), usado dentro do painel de premissas. */
export const opcoesAba = (attr, atual, opcoes) => `<div class="el-abas" role="group">${opcoes.map(([k, n]) => `<button type="button" class="el-aba" ${attr}="${esc(k)}" aria-pressed="${String(k) === String(atual)}">${esc(n)}</button>`).join("")}</div>`;

/**
 * Faixa de premissas fixa (PremissasFixas): as escolhas ativas à vista e, no botão Ajustar, o painel com todos os controles.
 * @param {string} attr atributo do botão que abre e fecha (o app trata o clique)  @param {[string,string][]} itens [rótulo, valor]
 */
export function faixaPremissas(attr, itens, corpo, aberto) {
  return `<div class="el-premissas"><button type="button" class="el-premissas__barra" ${attr} aria-expanded="${!!aberto}"><span class="el-premissas__lista">${itens.map(([r, v]) => `<span><small>${esc(r)}</small>${esc(v)}</span>`).join("")}</span><span class="el-premissas__ajustar">${aberto ? "Fechar ▴" : "Ajustar ▾"}</span></button>
    <div class="el-premissas__painel"${aberto ? "" : " hidden"}>${corpo}<div class="el-premissas__fim"><button type="button" class="el-botao el-botao--cheio" ${attr}>Aplicar</button></div></div></div>`;
}
