// Gráficos simples em SVG, sem bibliotecas.
const hhmm = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Linha da evolução do % de seções apuradas ao longo do tempo.
 * @param {{t:number}[]} pontos fotos do histórico (t em segundos)
 * @param {(p:object)=>number|undefined} valor extrai o % de cada foto
 */
export function linhaEvolucao(pontos, valor, { largura = 640, altura = 190, rotulo = "Evolução da apuração" } = {}) {
  const pts = pontos.map((p) => ({ t: p.t * 1000, v: valor(p) })).filter((p) => p.v != null);
  if (pts.length < 2) {
    return `<p class="muted vazio-grafico">O gráfico começa quando a apuração iniciar. O histórico é registrado a cada minuto.</p>`;
  }
  const m = { e: 38, d: 12, c: 10, b: 24 };
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 60000);
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - v / 100) * (altura - m.c - m.b);
  // degrau: o valor se mantém até a próxima foto
  let d = `M${x(pts[0].t).toFixed(1)},${y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${x(pts[i].t).toFixed(1)},${y(pts[i - 1].v).toFixed(1)} L${x(pts[i].t).toFixed(1)},${y(pts[i].v).toFixed(1)}`;
  const area = `${d} L${x(pts[pts.length - 1].t).toFixed(1)},${y(0)} L${x(t0).toFixed(1)},${y(0)} Z`;
  const grade = [0, 25, 50, 75, 100]
    .map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${g}%</text>`)
    .join("");
  const ticks = [0, 1, 2, 3, 4]
    .map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; })
    .join("");
  const ult = pts[pts.length - 1];
  return `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${rotulo}: ${ult.v.toLocaleString("pt-BR")}% das seções apuradas">
    ${grade}${ticks}<path class="g-area" d="${area}"/><path class="g-linha" d="${d}"/>
    <circle class="g-ponto" cx="${x(ult.t)}" cy="${y(ult.v)}" r="4"/></svg>`;
}

/** Mini gráfico para listas. */
export function sparkline(pontos, valor, { largura = 84, altura = 24 } = {}) {
  const v = pontos.map(valor).filter((n) => n != null);
  if (v.length < 2) return `<span class="spark vazio">–</span>`;
  const x = (i) => (i / (v.length - 1)) * (largura - 2) + 1;
  const y = (n) => (1 - n / 100) * (altura - 4) + 2;
  const d = v.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${largura} ${altura}" aria-hidden="true"><path d="${d}"/></svg>`;
}
