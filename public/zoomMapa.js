// Zoom e arrasto dos mapas em SVG: botões +, − e "mostrar tudo", arrastar para mover, pinça no celular,
// Ctrl + roda do mouse e toque duplo. O mapa é redesenhado a cada atualização da tela; a vista escolhida é guardada e reaplicada.

const MAX_ZOOM = 80;
const vistas = new Map(); // id do mapa -> { base: "viewBox original", vb: [x, y, w, h] }

const partes = (s) => String(s).trim().split(/\s+/).map(Number);
const texto = (vb) => vb.map((n) => +n.toFixed(5)).join(" ");

/** Aproxima (f > 1) ou afasta (f < 1) em torno do ponto (fx, fy), sem sair do mapa inteiro nem passar do zoom máximo. */
export function zoomar(vb, base, f, fx, fy) {
  const [bx, by, bw, bh] = base, [x, y, w, h] = vb;
  const w2 = Math.min(bw, Math.max(bw / MAX_ZOOM, w / f)), h2 = (w2 / bw) * bh;
  const x2 = fx - ((fx - x) / w) * w2, y2 = fy - ((fy - y) / h) * h2;
  return limitar([x2, y2, w2, h2], base);
}

/** Desloca a vista, mantendo o centro dentro do mapa. */
export const mover = (vb, base, dx, dy) => limitar([vb[0] + dx, vb[1] + dy, vb[2], vb[3]], base);

function limitar([x, y, w, h], [bx, by, bw, bh]) {
  return [Math.min(Math.max(x, bx - w / 2), bx + bw - w / 2), Math.min(Math.max(y, by - h / 2), by + bh - h / 2), w, h];
}

/** Quantas vezes o mapa está ampliado. */
export const nivel = (vb, base) => base[2] / vb[2];

/** Círculos (locais de votação) encolhem com o zoom, para os pontos vizinhos se separarem ao aproximar. */
function ajustarPontos(svg, z) {
  const k = 1 / Math.sqrt(z);
  for (const c of svg.querySelectorAll("circle[data-r0]")) c.setAttribute("r", (c.dataset.r0 * k).toFixed(1));
}

function aplicar(svg, vb) {
  const id = svg.dataset.zoom, base = partes(svg.dataset.base ?? svg.getAttribute("viewBox"));
  svg.setAttribute("viewBox", texto(vb));
  vistas.set(id, { base: svg.dataset.base, vb });
  ajustarPontos(svg, nivel(vb, base));
  const r = svg.closest(".zoom-wrap")?.querySelector("[data-zoom-act=reset]");
  if (r) r.hidden = nivel(vb, base) < 1.02;
}

/** Depois de cada desenho da tela: guarda o enquadramento original e volta à vista escolhida, se o mapa for o mesmo. */
export function reaplicarZoom(raiz) {
  for (const svg of raiz.querySelectorAll("svg[data-zoom]")) {
    svg.dataset.base = svg.getAttribute("viewBox");
    const v = vistas.get(svg.dataset.zoom);
    if (v && v.base === svg.dataset.base) aplicar(svg, v.vb);
    else { vistas.set(svg.dataset.zoom, { base: svg.dataset.base, vb: partes(svg.dataset.base) }); ajustarPontos(svg, 1); const r = svg.closest(".zoom-wrap")?.querySelector("[data-zoom-act=reset]"); if (r) r.hidden = true; }
  }
}

/** Caixa com os botões de zoom em volta de um SVG que tenha data-zoom="<id>". */
export const caixaZoom = (svg) => `<div class="zoom-wrap">${svg}<div class="zoom-ctl" role="group" aria-label="Zoom do mapa"><button type="button" data-zoom-act="mais" aria-label="Aproximar">+</button><button type="button" data-zoom-act="menos" aria-label="Afastar">−</button><button type="button" data-zoom-act="reset" aria-label="Mostrar o mapa inteiro" hidden>⤢</button></div></div><p class="muted nota zoom-dica">Aproxime com + e −, com dois dedos ou com Ctrl + roda do mouse. Arraste para mover.</p>`;

// ---------- gestos ----------
function paraSvg(svg, cx, cy) {
  const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
  const m = svg.getScreenCTM();
  return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
}
const vistaDe = (svg) => vistas.get(svg.dataset.zoom)?.vb ?? partes(svg.getAttribute("viewBox"));
const baseDe = (svg) => partes(svg.dataset.base ?? svg.getAttribute("viewBox"));

/** Liga os gestos uma vez, no contêiner que guarda a tela (os mapas são redesenhados dentro dele). */
export function ligarZoom(cont) {
  const dedos = new Map();
  let inicio = null, moveu = false;

  cont.addEventListener("pointerdown", (e) => {
    const svg = e.target.closest?.("svg[data-zoom]");
    if (!svg) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg.setPointerCapture?.(e.pointerId);
    moveu = false;
    inicio = { svg, vb: vistaDe(svg), p: [...dedos.values()].map((d) => ({ ...d })), sx: e.clientX, sy: e.clientY };
  });

  cont.addEventListener("pointermove", (e) => {
    if (!inicio || !dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { svg } = inicio, base = baseDe(svg);
    if (dedos.size >= 2) { // pinça: a escala vem da distância entre os dois dedos; o centro acompanha
      const [a, b] = [...dedos.values()], [a0, b0] = inicio.p.length >= 2 ? inicio.p : [inicio.p[0], inicio.p[0]];
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y), d1 = Math.hypot(a.x - b.x, a.y - b.y);
      if (d0 < 10) { inicio.p = [...dedos.values()].map((d) => ({ ...d })); inicio.vb = vistaDe(svg); return; }
      moveu = true;
      const f = d1 / d0, c0 = paraSvg(svg, (a0.x + b0.x) / 2, (a0.y + b0.y) / 2), c1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = zoomar(inicio.vb, base, f, c0.x, c0.y), m = svg.getScreenCTM();
      aplicar(svg, mover(z, base, ((a0.x + b0.x) / 2 - c1.x) / (m?.a || 1), ((a0.y + b0.y) / 2 - c1.y) / (m?.d || 1)));
      return;
    }
    const dx = e.clientX - inicio.sx, dy = e.clientY - inicio.sy;
    if (!moveu && Math.hypot(dx, dy) < 6) return; // ainda é um toque
    moveu = true;
    const m = svg.getScreenCTM();
    aplicar(svg, mover(inicio.vb, base, -dx / (m?.a || 1), -dy / (m?.d || 1)));
  });

  const soltar = (e) => {
    dedos.delete(e.pointerId);
    if (inicio && dedos.size === 1) { const [d] = [...dedos.values()]; inicio = { svg: inicio.svg, vb: vistaDe(inicio.svg), p: [{ ...d }], sx: d.x, sy: d.y }; }
    if (!dedos.size) inicio = null;
  };
  cont.addEventListener("pointerup", soltar);
  cont.addEventListener("pointercancel", soltar);

  // depois de arrastar, o clique que o navegador gera não pode selecionar um ponto
  cont.addEventListener("click", (e) => { if (moveu && e.target.closest?.("svg[data-zoom]")) { moveu = false; e.stopPropagation(); e.preventDefault(); } }, true);

  cont.addEventListener("wheel", (e) => {
    const svg = e.target.closest?.("svg[data-zoom]");
    if (!svg || !(e.ctrlKey || e.metaKey)) return; // sem Ctrl, a roda rola a página
    e.preventDefault();
    const p = paraSvg(svg, e.clientX, e.clientY);
    aplicar(svg, zoomar(vistaDe(svg), baseDe(svg), Math.exp(-e.deltaY * 0.012), p.x, p.y));
  }, { passive: false });

  cont.addEventListener("dblclick", (e) => {
    const svg = e.target.closest?.("svg[data-zoom]");
    if (!svg) return;
    const p = paraSvg(svg, e.clientX, e.clientY);
    aplicar(svg, zoomar(vistaDe(svg), baseDe(svg), 2, p.x, p.y));
  });

  cont.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-zoom-act]");
    if (!b) return;
    const svg = b.closest(".zoom-wrap")?.querySelector("svg[data-zoom]");
    if (!svg) return;
    const base = baseDe(svg), vb = vistaDe(svg);
    if (b.dataset.zoomAct === "reset") return aplicar(svg, base);
    aplicar(svg, zoomar(vb, base, b.dataset.zoomAct === "mais" ? 1.7 : 1 / 1.7, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2));
  });
}
