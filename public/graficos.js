// Gráficos simples em SVG, sem bibliotecas.
import { pct, fmt } from "./formato.js";
import { FIM_VOTACAO } from "./config.js";
const escAttr = (o) => JSON.stringify(o).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
/** Dados que tornam o gráfico consultável (ver graficoInterativo.js): geometria, instantes e séries. */
const dadosG = (largura, altura, m, t0, t1, kz, ts, series, extra = {}) => escAttr({ l: largura, h: altura, e: m.e, d: m.d, c: m.c, b: m.b, t0, t1, ts, series, ...(kz ? { corte: { de: kz.de, s: kz.s } } : {}), ...extra });
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/**
 * Emenda do eixo: se não houve apuração entre o último ponto antes de `fim` e `fim` (votação prorrogada), esse trecho sai do eixo.
 * Os instantes depois de `fim` andam para trás por `s`, o que liga o último ponto ao primeiro a partir de `fim`, sem reta nem vazio.
 * Muda `pts[].t` no lugar e devolve { de, s, fim, ate }, ou null quando não há o que emendar. `real(t)` volta ao horário de verdade.
 */
export function emendar(pts, ate = 0, fim = FIM_VOTACAO) {
  if (!fim) return null;
  const i = pts.findIndex((p, k) => p.t < fim && pts[k + 1] && pts[k + 1].t >= fim);
  if (i < 0 || fim - pts[i].t < 10 * 60000) return null;
  const de = pts[i].t, s = fim - de;
  for (const p of pts) if (p.t >= fim) p.t -= s;
  return { de, s, fim, ate: ate > de ? Math.max(de, ate - s) : ate };
}
/** Zoom do eixo vertical: só visual e só na memória (o gráfico sempre abre em "Eixo completo"). */
const zoomes = new Set();
export const zoomLigado = (chave) => zoomes.has(chave);
export const zerarZoom = () => zoomes.clear();
export const alternarZoom = (chave, ligado) => { if (ligado) zoomes.add(chave); else zoomes.delete(chave); };
/** Eixo ampliado: do menor valor menos 5 p.p. ao maior mais 5 p.p., em múltiplos de 5, entre 0% e 100% (no mínimo 10 p.p. de altura). */
export function eixoAmpliado(valores) {
  const v = valores.filter(Number.isFinite);
  if (!v.length) return { lo: 0, hi: 100 };
  let lo = Math.max(0, Math.floor((Math.min(...v) - 5) / 5) * 5), hi = Math.min(100, Math.ceil((Math.max(...v) + 5) / 5) * 5);
  if (hi - lo < 10) { if (hi < 100) hi = Math.min(100, lo + 10); else lo = Math.max(0, hi - 10); }
  return { lo, hi };
}
/** Valores das linhas de grade: de 5 em 5 p.p., ou de 10 em 10 quando não cabem (menos de 24px entre uma e outra). */
export function gradeDoEixo(lo, hi, alturaUtil) {
  const passo = alturaUtil / ((hi - lo) / 5) >= 24 ? 5 : 10, g = [];
  for (let v = Math.ceil(lo / passo) * passo; v <= hi + 1e-9; v += passo) g.push(v);
  return g;
}
const controleZoom = (chave, ligado) => `<div class="el-visao g-zoom" role="group" aria-label="Eixo vertical do gráfico"><button type="button" data-zoom-grafico="${esc(chave)}" data-zoom="completo" aria-pressed="${!ligado}">Eixo completo</button><button type="button" data-zoom-grafico="${esc(chave)}" data-zoom="ampliar" aria-pressed="${ligado}">Ampliar</button></div>`;
const notaEixo = (lo, hi) => `<p class="g-eixo-nota">Eixo ampliado: ${lo}% a ${hi}%</p>`;
/** Rótulos de hora do eixo: 5 quando cabem, 3 num gráfico estreito; nenhum dentro do trecho removido pela emenda. */
function ticksHora(t0, t1, x, kz, largura, m, yTexto) {
  const n = largura - m.e - m.d < 260 ? 3 : 5;
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / (n - 1);
    if (kz && Math.abs(x(t) - x(kz.de)) < 34) return "";
    return `<text class="g-txt" x="${x(t)}" y="${yTexto}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${hhmm(realDe(kz, t))}</text>`;
  }).join("");
}
const realDe = (kz, t) => (kz && t > kz.de ? t + kz.s : t);
const horaCheia = (ms) => { const [h, m] = hhmm(ms).split(":"); return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`; };
/** Marca da emenda: corte no eixo e a legenda do trecho removido. */
function corteSvg(kz, x, m, altura, largura) {
  if (!kz) return "";
  const cx = x(kz.de), yb = altura - m.b, esquerda = cx < largura / 2;
  return `<g class="g-corte" aria-hidden="true"><line x1="${cx}" x2="${cx}" y1="${m.c}" y2="${yb}"/><path d="M${cx - 6},${yb + 4} l6,-8 M${cx},${yb + 4} l6,-8"/><text x="${esquerda ? cx + 8 : cx - 8}" y="${altura - 5}" text-anchor="${esquerda ? "start" : "end"}">sem apuração até as ${horaCheia(kz.fim)}</text></g>`;
}
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
  const kz = emendar(pts, ate), t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, kz?.ate ?? ate, t0 + 60000);
  const ext = kz ? 18 : 0; // com a emenda, uma linha a mais embaixo para a legenda do corte
  altura += ext; m.b += ext;
  const ampliado = zoomes.has(rotulo), { lo, hi } = ampliado ? eixoAmpliado(pts.map((p) => p.v)) : { lo: 0, hi: 100 };
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - (v - lo) / (hi - lo)) * (altura - m.c - m.b);
  // degrau: o valor se mantém até a próxima foto
  let d = `M${x(pts[0].t).toFixed(1)},${y(pts[0].v).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${x(pts[i].t).toFixed(1)},${y(pts[i - 1].v).toFixed(1)} L${x(pts[i].t).toFixed(1)},${y(pts[i].v).toFixed(1)}`;
  const area = `${d} L${x(pts[pts.length - 1].t).toFixed(1)},${y(lo)} L${x(t0).toFixed(1)},${y(lo)} Z`;
  const grade = (ampliado ? gradeDoEixo(lo, hi, altura - m.c - m.b) : [0, 25, 50, 75, 100])
    .map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`)
    .join("");
  const ticks = ticksHora(t0, t1, x, kz, largura, m, altura - 6 - ext);
  const ult = pts[pts.length - 1];
  const dg = dadosG(largura, altura, m, t0, t1, kz, pts.map((p) => p.t), [{ n: "Seções apuradas", v: pts.map((p) => p.v), y: [lo, hi] }]);
  return `${controleZoom(rotulo, ampliado)}${ampliado ? notaEixo(lo, hi) : ""}<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="${rotulo}: ${pct(ult.v)} das seções apuradas">
    ${grade}${ticks}<path class="g-area" d="${area}"/><path class="g-linha" d="${d}"/>
    <circle class="g-ponto" cx="${x(ult.t)}" cy="${y(ult.v)}" r="4"/>${corteSvg(kz, x, m, altura, largura)}</svg><div class="g-info" hidden></div>`;
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
  const kz = emendar(pts, ate), t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, kz?.ate ?? ate, t0 + 60000);
  const ext = kz ? 18 : 0; // com a emenda, uma linha a mais embaixo para a legenda do corte
  altura += ext; m.b += ext;
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const comUrnas = pts.some((p) => p.u != null);
  if (comUrnas) { let ant = 0; for (const p of pts) { if (p.u == null) p.u = ant; ant = p.u; } } // lacunas: mantém o último valor
  const ampliado = zoomes.has(rotulo), { lo, hi } = ampliado ? eixoAmpliado(pts.flatMap((p) => [p.c, p.c + p.a, ...(comUrnas ? [p.u] : [])])) : { lo: 0, hi: 100 };
  const y = (v) => m.c + (1 - (Math.min(hi, v) - lo) / (hi - lo)) * (altura - m.c - m.b);
  const degrau = (valor) => {
    let d = `${x(pts[0].t).toFixed(1)},${y(valor(pts[0])).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` ${x(pts[i].t).toFixed(1)},${y(valor(pts[i - 1])).toFixed(1)} ${x(pts[i].t).toFixed(1)},${y(valor(pts[i])).toFixed(1)}`;
    return d;
  };
  const topo = degrau((p) => p.c + p.a), meio = degrau((p) => p.c);
  const base = (t) => `${x(t).toFixed(1)},${y(lo)}`;
  const ult = pts[pts.length - 1], fim = base(ult.t), ini = base(t0);
  const grade = (ampliado ? gradeDoEixo(lo, hi, altura - m.c - m.b) : [0, 25, 50, 75, 100]).map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`).join("");
  const ticks = ticksHora(t0, t1, x, kz, largura, m, altura - 6 - ext);
  const linhaUrnas = comUrnas ? `<polyline class="g-urnas" points="${degrau((p) => p.u)}"/>` : "";
  const dg = dadosG(largura, altura, m, t0, t1, kz, pts.map((p) => p.t), [{ n: "Presentes", v: pts.map((p) => p.c), y: [lo, hi] }, { n: "Ausentes", v: pts.map((p) => p.a), y: [lo, hi] }, ...(comUrnas ? [{ n: "Urnas apuradas", cor: "#7cc4ff", v: pts.map((p) => p.u), y: [lo, hi] }] : [])]);
  const recorte = `rec-${Math.abs([...rotulo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`; // o zoom corta o que passa do quadro do gráfico
  return `${controleZoom(rotulo, ampliado)}${ampliado ? notaEixo(lo, hi) : ""}<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="${rotulo}: ${pct(ult.c)} presentes e ${pct(ult.a)} ausentes do eleitorado">
    <clipPath id="${recorte}"><rect x="${m.e}" y="${m.c}" width="${largura - m.e - m.d}" height="${altura - m.c - m.b}"/></clipPath>
    ${grade}${ticks}<g clip-path="url(#${recorte})"><polygon class="g-aus" points="${topo} ${fim} ${ini}"/><polygon class="g-pres" points="${meio} ${fim} ${ini}"/>
    <polyline class="g-borda" points="${topo}"/>${linhaUrnas}</g>${corteSvg(kz, x, m, altura, largura)}</svg><div class="g-info" hidden></div>`;
}

const TITULOS = new Set(["DR.", "DRA.", "PROF.", "CEL.", "CORONEL", "PROFESSOR", "PROFESSORA", "DELEGADO", "DELEGADA", "CAPITÃO", "SARGENTO", "PASTOR", "PASTORA", "JUIZ", "JUÍZA", "ESCRITOR", "TENENTE", "MAJOR", "GENERAL", "DOUTOR", "DOUTORA"]);
/** Nome curto para a etiqueta: "FLAVIO", "DR. LUIZINHO". */
export function nomeCurto(n) {
  const p = String(n ?? "").trim().split(/\s+/);
  return p.length > 1 && TITULOS.has(p[0].toUpperCase()) ? `${p[0]} ${p[1]}` : p[0] ?? "";
}

/** Texto da diferença entre os dois primeiros colocados naquele instante: "FLAVIO +3,91 p.p. · 4.512.300 votos". */
export function textoDiferenca(r, nome, base = r.vv) {
  const ord = Object.entries(r.c).sort((a, b) => b[1] - a[1]);
  if (ord.length < 2 || !base) return "";
  const [[id1, v1], [, v2]] = ord, dif = v1 - v2;
  if (dif <= 0) return "Empatados";
  return `${nomeCurto(nome(id1))} +${pct((dif / base) * 100).replace("%", " p.p.")} · ${fmt(dif)} votos`;
}

/**
 * Evolução do % de votos válidos de cada candidato, minuto a minuto.
 * @param {{cands:object, pontos:object[]}} rp histórico de resultados (worker/resultados.js)
 * @param {string|string[]} local "br", "rj", "zz"... (lista = soma dos locais)
 * @param {(sigla:string)=>string} cor cor do partido
 */
/** Os pontos do histórico trazem os eleitores aptos apurados (es)? Sem isso, a visão de votos totais não tem como ser desenhada. */
export function temTotais(rp, local, inicio = 0) {
  const locais = [].concat(local);
  return (rp?.pontos ?? []).some((p) => p.t * 1000 >= inicio && locais.every((l) => p.v?.[l]?.es > 0));
}

/** A série por minuto de um lugar (um local ou a soma dos estados de uma região): pontos, candidatos de cima, e como calcular o % de cada um. */
export function serieResultado(rp, local, { max = 6, inicio = 0, ate = 0, base = "validos", excluir = [] } = {}) {
  const totais = base === "totais" && temTotais(rp, local, inicio); // % sobre todos os aptos apurados, com a linha "Não voto"
  const locais = [].concat(local); // lista = soma de vários locais (estados de uma região)
  const junta = (v) => {
    const rs = locais.map((l) => v?.[l]).filter(Boolean);
    if (!rs.length) return null;
    const c = {};
    for (const r of rs) for (const [id, n] of Object.entries(r.c)) c[id] = (c[id] ?? 0) + n;
    let vv = rs.reduce((t, r) => t + r.vv, 0);
    for (const id of excluir) if (c[id] != null) { vv -= c[id]; delete c[id]; } // cenário sem sub judice: tira esses candidatos e seus votos da base
    return { vv, es: rs.reduce((t, r) => t + (r.es || 0), 0), c };
  };
  const pts = (rp?.pontos ?? []).map((p) => ({ t: p.t * 1000, r: junta(p.v) })).filter((p) => p.r && p.r.vv > 0 && p.t >= inicio && (!totais || p.r.es > 0));
  if (ate && pts.length && ate > pts[pts.length - 1].t) pts.push({ ...pts[pts.length - 1], t: ate });
  if (pts.length < 1) return null;
  const ult = pts[pts.length - 1].r;
  const ids = Object.keys(ult.c).sort((a, b) => ult.c[b] - ult.c[a]).slice(0, max);
  const den = (r) => (totais ? r.es : r.vv);
  const pc = (r, id) => ((r.c[id] ?? 0) / den(r)) * 100;
  const pcNv = (r) => ((r.es - r.vv) / r.es) * 100; // não voto: brancos + nulos + abstenções
  return { pts, ids, totais, ult, den, pc, pcNv, locais };
}

export function linhasResultado(rp, local, cor, { largura = 640, altura = 220, max = 6, inicio = 0, ate = 0, base = "validos", excluir = [], semNaoVoto = false, comControleZoom = true } = {}) {
  const S = serieResultado(rp, local, { max, inicio, ate, base, excluir });
  if (!S) return `<p class="muted vazio-grafico">O gráfico começa quando os primeiros votos forem apurados. O resultado é registrado a cada minuto.</p>`;
  const { pts, ids, totais, ult, den, pc, pcNv, locais } = S, nv = totais && !semNaoVoto; // nv: a linha "não voto" tracejada (só na base Eleitores aptos)
  const topo = Math.max(10, Math.ceil(Math.max(...pts.flatMap((p) => [...ids.map((id) => pc(p.r, id)), ...(nv ? [pcNv(p.r)] : [])])) / 10) * 10);
  const m = { e: 56, d: 12, c: 34, b: 24 }; // a faixa de cima abriga a etiqueta da diferença
  altura += 24;
  const kz = emendar(pts, ate), t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, kz?.ate ?? ate, t0 + 60000);
  const ext = kz ? 18 : 0; // com a emenda, uma linha a mais embaixo para a legenda do corte
  altura += ext; m.b += ext;
  const chaveZoom = `resultado:${locais.join(",")}`, ampliado = zoomes.has(chaveZoom);
  const { lo, hi } = ampliado ? eixoAmpliado(pts.flatMap((p) => [...ids.map((id) => pc(p.r, id)), ...(nv ? [pcNv(p.r)] : [])])) : { lo: 0, hi: topo };
  const x = (t) => m.e + ((t - t0) / (t1 - t0)) * (largura - m.e - m.d);
  const y = (v) => m.c + (1 - (v - lo) / (hi - lo)) * (altura - m.c - m.b);
  const passo = topo <= 20 ? 5 : 10, linhasGrade = [];
  if (ampliado) linhasGrade.push(...gradeDoEixo(lo, hi, altura - m.c - m.b));
  else for (let g = 0; g <= topo; g += passo) linhasGrade.push(g);
  const grade = linhasGrade.map((g) => `<line class="g-grade" x1="${m.e}" x2="${largura - m.d}" y1="${y(g)}" y2="${y(g)}"/><text class="g-txt" x="${m.e - 6}" y="${y(g) + 4}" text-anchor="end">${pct(g)}</text>`).join("");
  const ticks = ticksHora(t0, t1, x, kz, largura, m, altura - 6 - ext);
  const nome = (id) => rp.cands?.[id]?.n || id, partido = (id) => rp.cands?.[id]?.p || "";
  const linhas = ids.map((id) => {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(pc(p.r, id)).toFixed(1)}`).join(" ");
    return `<path class="g-cand" d="${d}" style="stroke:${cor(partido(id))}"/><circle cx="${x(pts[pts.length - 1].t).toFixed(1)}" cy="${y(pc(ult, id)).toFixed(1)}" r="3.5" style="fill:${cor(partido(id))}"/>`;
  }).join("");
  const linhaNv = nv ? `<path class="g-cand g-naovoto" d="${pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(pcNv(p.r)).toFixed(1)}`).join(" ")}"/><circle cx="${x(pts[pts.length - 1].t).toFixed(1)}" cy="${y(pcNv(ult)).toFixed(1)}" r="3.5" class="g-nv-ponto"/>` : "";
  const legenda = ids.map((id) => `<span><i class="pt" style="background:${cor(partido(id))}"></i>${nome(id)} <b>${pct(pc(ult, id))}</b></span>`).join("")
    + (nv ? `<span><i class="pt pt-nv"></i>Não voto <b>${pct(pcNv(ult))}</b></span>` : "");
  const rot = pts.map((p) => textoDiferenca(p.r, nome, den(p.r)));
  const dg = dadosG(largura, altura, m, t0, t1, kz, pts.map((p) => p.t), [...ids.map((id) => ({ n: nome(id), cor: cor(partido(id)), v: pts.map((p) => pc(p.r, id)), y: [lo, hi] })), ...(nv ? [{ n: "Não voto", cor: "#8a94a3", v: pts.map((p) => pcNv(p.r)), y: [lo, hi] }] : [])], { rot });
  const ultRot = rot[rot.length - 1];
  const etiqueta = ultRot ? `<g class="g-dif"><rect x="${m.e}" y="5" width="${Math.min(largura - m.e - m.d, ultRot.length * 6.9 + 20)}" height="22" rx="11"/><text x="${m.e + 9}" y="20">${esc(ultRot)}</text></g>` : "";
  return `${comControleZoom ? controleZoom(chaveZoom, ampliado) : ""}${ampliado ? notaEixo(lo, hi) : ""}<svg class="grafico interativo" viewBox="0 0 ${largura} ${altura}" data-g="${dg}" role="img" aria-label="Evolução do resultado dos candidatos${ultRot ? `. ${esc(ultRot)}` : ""}">${etiqueta}${grade}${ticks}${linhas}${linhaNv}${corteSvg(kz, x, m, altura, largura)}</svg><div class="g-info" hidden></div><div class="legenda-cand">${legenda}</div>`;
}
