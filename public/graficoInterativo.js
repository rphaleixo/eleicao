// Consulta dos gráficos: toque ou passe o mouse em um momento para ver os valores daquele instante.
import { pct } from "./formato.js";
const NS = "http://www.w3.org/2000/svg";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const quando = (ms) => new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Índice do último instante igual ou anterior a `t` (ou 0). */
export function indiceEm(ts, t) {
  let i = 0;
  for (let k = 0; k < ts.length; k++) { if (ts[k] <= t) i = k; else break; }
  return i;
}

/** Instante (ms) correspondente à posição horizontal `px` (em unidades do viewBox). */
export const instanteEm = (g, px) => g.t0 + ((Math.min(Math.max(px, g.e), g.l - g.d) - g.e) / (g.l - g.e - g.d)) * (g.t1 - g.t0);

const memoria = new Map(); // posição do gráfico na tela -> instante escolhido (sobrevive à atualização do conteúdo)

function marcar(svg, g, ordem, t) {
  const i = indiceEm(g.ts, t);
  const x = g.e + ((g.ts[i] - g.t0) / (g.t1 - g.t0)) * (g.l - g.e - g.d);
  svg.querySelector(".g-cursor")?.remove();
  const el = document.createElementNS(NS, "g"); el.setAttribute("class", "g-cursor");
  let html = `<line x1="${x}" x2="${x}" y1="${g.c}" y2="${g.h - g.b}"/>`;
  g.series.forEach((s) => {
    const [a, b] = s.y ?? [0, 100], yy = g.c + (1 - (s.v[i] - a) / (b - a)) * (g.h - g.c - g.b);
    html += `<circle cx="${x}" cy="${yy}" r="4" ${s.cor ? `style="fill:${s.cor}"` : ""}/>`;
  });
  el.innerHTML = html; svg.appendChild(el);
  const info = svg.nextElementSibling;
  if (info?.classList.contains("g-info")) {
    info.hidden = false;
    info.innerHTML = `<b>${quando(g.ts[i])}</b>` + g.series.map((s) => `<span>${s.cor ? `<i class="pt" style="background:${s.cor}"></i>` : ""}${esc(s.n)} <b>${pct(s.v[i])}</b></span>`).join("");
  }
  memoria.set(ordem, g.ts[i]);
}

const chave = (raiz, svg) => `${[...raiz.querySelectorAll("svg.interativo")].indexOf(svg)}|${svg.getAttribute("aria-label")}`;
function dadosDe(svg) { try { return JSON.parse(svg.dataset.g); } catch { return null; } }

/** Registra os eventos uma única vez no contêiner e reaplica a seleção após cada atualização. */
export function iniciarGraficos(raiz) {
  const escolher = (e) => {
    const svg = e.target.closest?.("svg.interativo");
    if (!svg || !raiz.contains(svg)) return;
    if (e.type === "pointermove" && e.pointerType !== "mouse" && !e.buttons) return; // no toque, só ao tocar/arrastar
    const g = dadosDe(svg); if (!g) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * g.l;
    marcar(svg, g, chave(raiz, svg), instanteEm(g, px));
  };
  raiz.addEventListener("pointerdown", escolher);
  raiz.addEventListener("pointermove", escolher);
}

export function reaplicarGraficos(raiz) {
  raiz.querySelectorAll("svg.interativo").forEach((svg) => {
    const k = chave(raiz, svg), t = memoria.get(k), g = dadosDe(svg);
    if (t != null && g && t >= g.t0) marcar(svg, g, k, t);
  });
}
