// Geografia do não voto: abstenção, brancos e nulos por município, com taxa, pessoas e o peso de cada município.
import { num } from "./tse.js";

export const METRICAS = [["abstencao", "Abstenção"], ["brancos", "Brancos"], ["nulos", "Nulos"]];
export const VISOES = [["taxa", "Taxa (%)"], ["pessoas", "Pessoas"], ["acima", "Acima da média"]];
export const MINIMOS = [[0, "Todos os municípios"], [10_000, "10 mil eleitores ou mais"], [50_000, "50 mil ou mais"], [100_000, "100 mil ou mais"], [500_000, "500 mil ou mais"]];
export const CARGOS_GEO = [["presidente", "Presidente"], ["governador", "Governador"], ["senador", "Senador"], ["dep-federal", "Dep. Federal"], ["dep-estadual", "Dep. Estadual"]];

/** Arquivo de andamento de um estado (-ab) -> Map(código TSE do município -> { aptos, comparecimento, abstencao, pctSecoes }). */
export function lerAbUf(json) {
  const m = new Map();
  for (const a of json?.abr ?? []) {
    if (a.tpabr !== "mun") continue;
    const e = a.e ?? {}, aptos = num(e.est) || num(e.te);
    m.set(String(a.cdabr), { aptos, comparecimento: num(e.c), abstencao: num(e.a), pctSecoes: num(a.e?.pest ?? a.s?.pst) });
  }
  return m;
}

/**
 * Uma linha por município, com o que já foi carregado.
 * @param {{municipios:Object<string,{cod:string,nome:string,ibge:string}[]>, ab:Map<string,Map>, urna:(uf:string,cod:string)=>object|undefined}} fonte
 *   ab: uf -> Map do lerAbUf;  urna: resultado do município no cargo (arquivo -u normalizado), se já carregado
 */
export function montarLinhas({ municipios, ab, urna }) {
  const linhas = [];
  for (const [uf, lista] of Object.entries(municipios ?? {})) {
    if (uf === "ZZ") continue; // exterior não tem município
    const abUf = ab?.get?.(uf) ?? ab?.[uf];
    for (const m of lista) {
      const a = abUf?.get(m.cod), d = urna?.(uf, m.cod);
      const e = d?.eleitorado;
      const aptos = e?.apuradas || a?.aptos || 0;
      const abstencao = e ? e.abstencao : a?.abstencao ?? null;
      if (!aptos && abstencao == null && !d) { linhas.push({ uf, cod: m.cod, ibge: m.ibge, nome: m.nome, aptos: 0, abstencao: null, brancos: null, nulos: null, comparecimento: null, pctSecoes: null }); continue; }
      linhas.push({ uf, cod: m.cod, ibge: m.ibge, nome: m.nome, aptos, abstencao,
        brancos: d ? d.brancos || 0 : null, nulos: d ? d.nulos || 0 : null,
        comparecimento: e?.comparecimento ?? a?.comparecimento ?? null, pctSecoes: d?.pctSecoes ?? a?.pctSecoes ?? null });
    }
  }
  return linhas;
}

/** Soma só as métricas escolhidas; sem o dado de alguma delas, o município fica sem valor. */
const somar = (l, metricas) => {
  let s = 0;
  for (const k of metricas) { if (l[k] == null) return null; s += l[k]; }
  return s;
};

const quantil = (ordenado, p) => (ordenado.length ? ordenado[Math.min(ordenado.length - 1, Math.floor(p * ordenado.length))] : 0);

/**
 * Calcula, para cada município, o valor das métricas escolhidas e as três visões:
 * taxa (% dos eleitores aptos), pessoas (número absoluto) e acima da média (pessoas a mais ou a menos do que a taxa nacional daria).
 * `minimo`: municípios com menos eleitores ficam de fora das cores e da média.
 */
export function calcular(linhas, { metricas, minimo = 0, uf = "" }) {
  const ms = [...metricas];
  const base = linhas.filter((l) => l.aptos > 0 && (!uf || l.uf === uf));
  const dentro = (l) => l.aptos >= minimo;
  const comValor = base.map((l) => ({ ...l, valor: somar(l, ms), fora: !dentro(l) }));
  const considerados = comValor.filter((l) => l.valor != null && !l.fora);
  const totalAptos = considerados.reduce((t, l) => t + l.aptos, 0), totalValor = considerados.reduce((t, l) => t + l.valor, 0);
  const taxaNacional = totalAptos ? (totalValor / totalAptos) * 100 : 0;
  const itens = comValor.map((l) => {
    const taxa = l.valor != null && l.aptos ? (l.valor / l.aptos) * 100 : null;
    const esperado = (taxaNacional / 100) * l.aptos;
    return { ...l, taxa, esperado, acima: l.valor != null ? l.valor - esperado : null };
  });
  return { itens, totalAptos, totalValor, taxaNacional, municipios: considerados.length, semDado: comValor.filter((l) => l.valor == null && !l.fora).length };
}

/** O número que cada visão pinta no mapa. */
export const valorDaVisao = (l, visao) => (l.valor == null || l.fora ? null : visao === "pessoas" ? l.valor : visao === "acima" ? l.acima : l.taxa);

/**
 * Classes de cor (0 a 4). Taxa e pessoas: cinco faixas com o mesmo número de municípios (quintis).
 * Acima da média: duas faixas abaixo, uma neutra e duas acima. Devolve { classe(v), cortes, rotulos[] } (rotulos sem formatação, para o chamador formatar).
 */
export function classesDeCor(itens, visao) {
  const vs = itens.map((l) => valorDaVisao(l, visao)).filter((v) => v != null);
  if (!vs.length) return { classe: () => -1, cortes: [], tipo: visao };
  if (visao === "acima") {
    const neg = vs.filter((v) => v < 0).map((v) => -v).sort((a, b) => a - b), pos = vs.filter((v) => v > 0).sort((a, b) => a - b);
    const todos = vs.map(Math.abs).sort((a, b) => a - b);
    const z = quantil(todos, 0.5) * 0.1, mn = quantil(neg, 0.5), mp = quantil(pos, 0.5);
    const cortes = [-mn, -z, z, mp];
    return { classe: (v) => (v <= -mn ? 0 : v < -z ? 1 : v <= z ? 2 : v < mp ? 3 : 4), cortes, tipo: visao };
  }
  const ord = vs.slice().sort((a, b) => a - b);
  const cortes = [0.2, 0.4, 0.6, 0.8].map((p) => quantil(ord, p));
  return { classe: (v) => cortes.filter((c) => v >= c).length, cortes, tipo: visao };
}

// ---------- enquadramento do mapa ----------
const caixas = new WeakMap();
/** Caixa (em unidades do desenho do IBGE) de um caminho SVG com M/L/H/V/Z, absolutos ou relativos. */
export function caixaDoCaminho(d) {
  let x = 0, y = 0, x0 = 0, y0 = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ponto = () => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; };
  for (const [, cmd, args] of d.matchAll(/([MmLlHhVvZz])([^MmLlHhVvZz]*)/g)) {
    const n = (args.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") { x = x0; y = y0; continue; }
    if (C === "H") { for (const v of n) { x = rel ? x + v : v; ponto(); } continue; }
    if (C === "V") { for (const v of n) { y = rel ? y + v : v; ponto(); } continue; }
    for (let i = 0; i + 1 < n.length; i += 2) {
      x = rel ? x + n[i] : n[i]; y = rel ? y + n[i + 1] : n[i + 1];
      if (C === "M" && i === 0) { x0 = x; y0 = y; }
      ponto();
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/** viewBox que enquadra os municípios de um estado dentro do desenho nacional (grupo com escala 0,0001 e y invertido). */
export function viewBoxDoEstado(malha, ibges) {
  let c = caixas.get(malha);
  if (!c) { c = new Map(); caixas.set(malha, c); }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ibges) {
    const d = malha.caminhos.get(id); if (!d) continue;
    if (!c.has(id)) c.set(id, caixaDoCaminho(d));
    const b = c.get(id); if (!b) continue;
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX); minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
  }
  if (minX === Infinity) return malha.viewBox;
  const k = 0.0001, mx = (maxX - minX) * k * 0.04, my = (maxY - minY) * k * 0.04;
  const x = minX * k - mx, w = (maxX - minX) * k + 2 * mx, y = -maxY * k - my, h = (maxY - minY) * k + 2 * my;
  return [x, y, w, h].map((n) => +n.toFixed(4)).join(" ");
}
