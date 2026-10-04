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

/**
 * Evolução do comparecimento e da abstenção, empilhados, em % do eleitorado total.
 * Quando a apuração se completa, as duas áreas somam 100%.
 * @param {object[]} pontos histórico (cada foto pode ter p[chave] = [compareceram, abstiveram])
 * @param {string|string[]} chave "br", "rj", "zz"... (lista = soma, usada nas regiões)
 * @param {number} eleitorado total de eleitores aptos
 */
export function areaPresenca(pontos, chave, eleitorado, { largura = 640, altura = 170, rotulo = "Comparecimento e abstenção" } = {}) {
  if (!eleitorado) return `<p class="muted vazio-grafico">Sem dados de eleitorado.</p>`;
  const pts = pontos.map((p) => {
    const chaves = [].concat(chave), partes = chaves.map((k) => p.p?.[k]);
    const par = partes.every(Boolean) ? [partes.reduce((s, x) => s + x[0], 0), partes.reduce((s, x) => s + x[1], 0)] : p.f?.[chaves[0]] === 0 ? [0, 0] : null; // antes da apuração começar, tudo é zero
    return par ? { t: p.t * 1000, c: (par[0] / eleitorado) * 100, a: (par[1] / eleitorado) * 100 } : null;
  }).filter(Boolean);
  if (pts.length < 2) return `<p class="muted vazio-grafico">O gráfico começa quando a apuração iniciar. O histórico é registrado a cada minuto.</p>`;
  const m = { e: 38, d: 12, c: 10, b: 24 };
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 60000);
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - Math.min(100, v) / 100) * (altura - m.c - m.b);
  const degrau = (valor) => {
    let d = `${x(pts[0].t).toFixed(1)},${y(valor(pts[0])).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` ${x(pts[i].t).toFixed(1)},${y(valor(pts[i - 1])).toFixed(1)} ${x(pts[i].t).toFixed(1)},${y(valor(pts[i])).toFixed(1)}`;
    return d;
  };
  const topo = degrau((p) => p.c + p.a), meio = degrau((p) => p.c);
  const base = (t) => `${x(t).toFixed(1)},${y(0)}`;
  const ult = pts[pts.length - 1], fim = base(ult.t), ini = base(t0);
  const grade = [0, 25, 50, 75, 100].map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${g}%</text>`).join("");
  const ticks = [0, 1, 2, 3, 4].map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; }).join("");
  return `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${rotulo}: ${ult.c.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% presentes e ${ult.a.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ausentes do eleitorado">
    ${grade}${ticks}<polygon class="g-aus" points="${topo} ${fim} ${ini}"/><polygon class="g-pres" points="${meio} ${fim} ${ini}"/>
    <polyline class="g-borda" points="${topo}"/></svg>`;
}

/**
 * Evolução do % de votos válidos de cada candidato, minuto a minuto.
 * @param {{cands:object, pontos:object[]}} rp histórico de resultados (worker/resultados.js)
 * @param {string} local "br", "rj", "zz"...
 * @param {(sigla:string)=>string} cor cor do partido
 */
export function linhasResultado(rp, local, cor, { largura = 640, altura = 220, max = 6 } = {}) {
  const pts = (rp?.pontos ?? []).map((p) => ({ t: p.t * 1000, r: p.v?.[local] })).filter((p) => p.r && p.r.vv > 0);
  if (pts.length < 2) return `<p class="muted vazio-grafico">O gráfico começa quando os primeiros votos forem apurados. O resultado é registrado a cada minuto.</p>`;
  const ult = pts[pts.length - 1].r;
  const ids = Object.keys(ult.c).sort((a, b) => ult.c[b] - ult.c[a]).slice(0, max);
  const pc = (r, id) => ((r.c[id] ?? 0) / r.vv) * 100;
  const topo = Math.max(10, Math.ceil(Math.max(...pts.flatMap((p) => ids.map((id) => pc(p.r, id)))) / 10) * 10);
  const m = { e: 38, d: 12, c: 10, b: 24 };
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 60000);
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - v / topo) * (altura - m.c - m.b);
  const passo = topo <= 20 ? 5 : 10, linhasGrade = [];
  for (let g = 0; g <= topo; g += passo) linhasGrade.push(g);
  const grade = linhasGrade.map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${g}%</text>`).join("");
  const ticks = [0, 1, 2, 3, 4].map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; }).join("");
  const nome = (id) => rp.cands?.[id]?.n || id, partido = (id) => rp.cands?.[id]?.p || "";
  const linhas = ids.map((id) => {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(pc(p.r, id)).toFixed(1)}`).join(" ");
    return `<path class="g-cand" d="${d}" style="stroke:${cor(partido(id))}"/><circle cx="${x(pts[pts.length - 1].t).toFixed(1)}" cy="${y(pc(ult, id)).toFixed(1)}" r="3.5" style="fill:${cor(partido(id))}"/>`;
  }).join("");
  const legenda = ids.map((id) => `<span><i class="pt" style="background:${cor(partido(id))}"></i>${nome(id)} <b>${pc(ult, id).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></span>`).join("");
  return `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Evolução do resultado dos candidatos">${grade}${ticks}${linhas}</svg><div class="legenda-cand">${legenda}</div>`;
}
