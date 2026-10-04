// Gráficos simples em SVG, sem bibliotecas.
import { pct, fmt } from "./formato.js";
const escAttr = (o) => JSON.stringify(o).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
/** Dados que tornam o gráfico consultável (ver graficoInterativo.js): geometria, instantes e séries. */
const dadosG = (largura, altura, m, t0, t1, ts, series, extra = {}) => escAttr({ l: largura, h: altura, e: m.e, d: m.d, c: m.c, b: m.b, t0, t1, ts, series, ...extra });
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hhmm = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/**
 * Linha da evolução do % de seções apuradas ao longo do tempo.
 * @param {{t:number}[]} pontos fotos do histórico (t em segundos)
 * @param {(p:object)=>number|undefined} valor extrai o % de cada foto
 */
export function linhaEvolucao(pontos, valor, { largura = 640, altura = 190, rotulo = "Evolução da apuração", inicio = 0, ate = 0 } = {}) {
  const pts = pontos.map((p) => ({ t: p.t * 1000, v: valor(p) })).filter((p) => p.v != null && p.v > 0 && p.t >= inicio); // começa quando a apuração começou de fato
  if (ate && pts.length && ate > pts[pts.length - 1].t) pts.push({ ...pts[pts.length - 1], t: ate }); // o valor se mantém até agora
  if (pts.length < 2) {
    return `<p class="muted vazio-grafico">O gráfico começa quando a apuração iniciar. O histórico é registrado a cada minuto.</p>`;
  }
  const m = { e: 56, d: 12, c: 10, b: 24 };
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, ate, t0 + 60000);
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - v / 100) * (altura - m.c - m.b);
  // degrau: o valor se mantém até a próxima foto
  let d = `M${x(pts[0].t).toFixed(1)},${y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${x(pts[i].t).toFixed(1)},${y(pts[i - 1].v).toFixed(1)} L${x(pts[i].t).toFixed(1)},${y(pts[i].v).toFixed(1)}`;
  const area = `${d} L${x(pts[pts.length - 1].t).toFixed(1)},${y(0)} L${x(t0).toFixed(1)},${y(0)} Z`;
  const grade = [0, 25, 50, 75, 100]
    .map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`)
    .join("");
  const ticks = [0, 1, 2, 3, 4]
    .map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; })
    .join("");
  const ult = pts[pts.length - 1];
  const dg = dadosG(largura, altura, m, t0, t1, pts.map((p) => p.t), [{ n: "Seções apuradas", v: pts.map((p) => p.v), y: [0, 100] }]);
  return `<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="${rotulo}: ${pct(ult.v)} das seções apuradas">
    ${grade}${ticks}<path class="g-area" d="${area}"/><path class="g-linha" d="${d}"/>
    <circle class="g-ponto" cx="${x(ult.t)}" cy="${y(ult.v)}" r="4"/></svg><div class="g-info" hidden></div>`;
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
export function areaPresenca(pontos, chave, eleitorado, { largura = 640, altura = 170, rotulo = "Comparecimento e abstenção", inicio = 0, ate = 0 } = {}) {
  if (!eleitorado) return `<p class="muted vazio-grafico">Sem dados de eleitorado.</p>`;
  const pts = pontos.map((p) => {
    const chaves = [].concat(chave), partes = chaves.map((k) => p.p?.[k]);
    const par = partes.every(Boolean) ? [partes.reduce((s, x) => s + x[0], 0), partes.reduce((s, x) => s + x[1], 0)] : p.f?.[chaves[0]] === 0 ? [0, 0] : null; // antes da apuração começar, tudo é zero
    const u = chaves.length === 1 ? p.f?.[chaves[0]] : null; // % das urnas (seções) apuradas naquele minuto, quando o recorte é um só
    return par ? { t: p.t * 1000, c: (par[0] / eleitorado) * 100, a: (par[1] / eleitorado) * 100, u: u ?? null } : null;
  }).filter((p) => p && p.c + p.a > 0 && p.t >= inicio);
  if (ate && pts.length && ate > pts[pts.length - 1].t) pts.push({ ...pts[pts.length - 1], t: ate });
  if (pts.length < 2) return `<p class="muted vazio-grafico">O gráfico começa quando a apuração iniciar. O histórico é registrado a cada minuto.</p>`;
  const m = { e: 56, d: 12, c: 10, b: 24 };
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, ate, t0 + 60000);
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
  const grade = [0, 25, 50, 75, 100].map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`).join("");
  const ticks = [0, 1, 2, 3, 4].map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; }).join("");
  const comUrnas = pts.some((p) => p.u != null);
  if (comUrnas) { let ant = 0; for (const p of pts) { if (p.u == null) p.u = ant; ant = p.u; } } // lacunas: mantém o último valor
  const linhaUrnas = comUrnas ? `<polyline class="g-urnas" points="${degrau((p) => p.u)}"/>` : "";
  const dg = dadosG(largura, altura, m, t0, t1, pts.map((p) => p.t), [{ n: "Presentes", v: pts.map((p) => p.c), y: [0, 100] }, { n: "Ausentes", v: pts.map((p) => p.a), y: [0, 100] }, ...(comUrnas ? [{ n: "Urnas apuradas", cor: "#7cc4ff", v: pts.map((p) => p.u), y: [0, 100] }] : [])]);
  return `<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="${rotulo}: ${pct(ult.c)} presentes e ${pct(ult.a)} ausentes do eleitorado">
    ${grade}${ticks}<polygon class="g-aus" points="${topo} ${fim} ${ini}"/><polygon class="g-pres" points="${meio} ${fim} ${ini}"/>
    <polyline class="g-borda" points="${topo}"/>${linhaUrnas}</svg><div class="g-info" hidden></div>`;
}

const TITULOS = new Set(["DR.", "DRA.", "PROF.", "CEL.", "CORONEL", "PROFESSOR", "PROFESSORA", "DELEGADO", "DELEGADA", "CAPITÃO", "SARGENTO", "PASTOR", "PASTORA", "JUIZ", "JUÍZA", "ESCRITOR", "TENENTE", "MAJOR", "GENERAL", "DOUTOR", "DOUTORA"]);
/** Nome curto para a etiqueta: "FLAVIO", "DR. LUIZINHO". */
export function nomeCurto(n) {
  const p = String(n ?? "").trim().split(/\s+/);
  return p.length > 1 && TITULOS.has(p[0].toUpperCase()) ? `${p[0]} ${p[1]}` : p[0] ?? "";
}

/** Texto da diferença entre os dois primeiros colocados naquele instante: "FLAVIO +3,91 p.p. · 4.512.300 votos". */
export function textoDiferenca(r, nome) {
  const ord = Object.entries(r.c).sort((a, b) => b[1] - a[1]);
  if (ord.length < 2 || !r.vv) return "";
  const [[id1, v1], [, v2]] = ord, dif = v1 - v2;
  if (dif <= 0) return "Empatados";
  return `${nomeCurto(nome(id1))} +${pct((dif / r.vv) * 100).replace("%", " p.p.")} · ${fmt(dif)} votos`;
}

/**
 * Evolução do % de votos válidos de cada candidato, minuto a minuto.
 * @param {{cands:object, pontos:object[]}} rp histórico de resultados (worker/resultados.js)
 * @param {string|string[]} local "br", "rj", "zz"... (lista = soma dos locais)
 * @param {(sigla:string)=>string} cor cor do partido
 */
export function linhasResultado(rp, local, cor, { largura = 640, altura = 220, max = 6, inicio = 0, ate = 0 } = {}) {
  const locais = [].concat(local); // lista = soma de vários locais (estados de uma região)
  const junta = (v) => {
    const rs = locais.map((l) => v?.[l]).filter(Boolean);
    if (!rs.length) return null;
    const c = {};
    for (const r of rs) for (const [id, n] of Object.entries(r.c)) c[id] = (c[id] ?? 0) + n;
    return { vv: rs.reduce((t, r) => t + r.vv, 0), c };
  };
  const pts = (rp?.pontos ?? []).map((p) => ({ t: p.t * 1000, r: junta(p.v) })).filter((p) => p.r && p.r.vv > 0 && p.t >= inicio);
  if (ate && pts.length && ate > pts[pts.length - 1].t) pts.push({ ...pts[pts.length - 1], t: ate });
  if (pts.length < 1) return `<p class="muted vazio-grafico">O gráfico começa quando os primeiros votos forem apurados. O resultado é registrado a cada minuto.</p>`;
  const ult = pts[pts.length - 1].r;
  const ids = Object.keys(ult.c).sort((a, b) => ult.c[b] - ult.c[a]).slice(0, max);
  const pc = (r, id) => ((r.c[id] ?? 0) / r.vv) * 100;
  const topo = Math.max(10, Math.ceil(Math.max(...pts.flatMap((p) => ids.map((id) => pc(p.r, id)))) / 10) * 10);
  const m = { e: 56, d: 12, c: 34, b: 24 }; // a faixa de cima abriga a etiqueta da diferença
  altura += 24;
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, ate, t0 + 60000);
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - v / topo) * (altura - m.c - m.b);
  const passo = topo <= 20 ? 5 : 10, linhasGrade = [];
  for (let g = 0; g <= topo; g += passo) linhasGrade.push(g);
  const grade = linhasGrade.map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`).join("");
  const ticks = [0, 1, 2, 3, 4].map((i) => { const t = t0 + ((t1 - t0) * i) / 4; return `<text class="g-txt" x="${x(t)}" y="${altura - 6}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${hhmm(t)}</text>`; }).join("");
  const nome = (id) => rp.cands?.[id]?.n || id, partido = (id) => rp.cands?.[id]?.p || "";
  const linhas = ids.map((id) => {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(pc(p.r, id)).toFixed(1)}`).join(" ");
    return `<path class="g-cand" d="${d}" style="stroke:${cor(partido(id))}"/><circle cx="${x(pts[pts.length - 1].t).toFixed(1)}" cy="${y(pc(ult, id)).toFixed(1)}" r="3.5" style="fill:${cor(partido(id))}"/>`;
  }).join("");
  const legenda = ids.map((id) => `<span><i class="pt" style="background:${cor(partido(id))}"></i>${nome(id)} <b>${pct(pc(ult, id))}</b></span>`).join("");
  const rot = pts.map((p) => textoDiferenca(p.r, nome));
  const dg = dadosG(largura, altura, m, t0, t1, pts.map((p) => p.t), ids.map((id) => ({ n: nome(id), cor: cor(partido(id)), v: pts.map((p) => pc(p.r, id)), y: [0, topo] })), { rot });
  const ultRot = rot[rot.length - 1];
  const etiqueta = ultRot ? `<g class="g-dif"><rect x="${m.e}" y="5" width="${Math.min(largura - m.e - m.d, ultRot.length * 6.9 + 20)}" height="22" rx="11"/><text x="${m.e + 9}" y="20">${esc(ultRot)}</text></g>` : "";
  return `<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="Evolução do resultado dos candidatos${ultRot ? `. ${esc(ultRot)}` : ""}">${etiqueta}${grade}${ticks}${linhas}</svg><div class="g-info" hidden></div><div class="legenda-cand">${legenda}</div>`;
}
