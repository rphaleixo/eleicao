// Comparação entre 1º e 2º turno para presidente: Lula, Flávio Bolsonaro, outros candidatos e não voto, por país, estado e município.
import { classesDeCor } from "./geo.js";

export const LULA = "13", FLAVIO = "22";
export const LINHAS = [["lula", "Lula"], ["flavio", "Flávio Bolsonaro"], ["outros", "Outros candidatos"], ["naovoto", "Não voto"]];
export const MEDIDAS = [["pp", "Variação em pontos %"], ["votos", "Variação em votos"], ["p1", "% no 1º turno"], ["p2", "% no 2º turno"], ["lider", "Quem liderou"]];

/** Uma "linha" é a votação de um lugar em um turno: números absolutos. */
const num = (n) => (Number.isFinite(n) ? n : 0);

/** A partir do resultado de presidente já normalizado (tse.js), de um estado, município ou do país. */
export function linhaDeResultado(d) {
  if (!d) return null;
  const e = d.eleitorado ?? {}, cs = d.candidatos ?? [];
  const por = (n) => cs.find((c) => c.numero === n)?.votos ?? 0;
  const lula = por(LULA), flavio = por(FLAVIO), outros = cs.filter((c) => c.numero !== LULA && c.numero !== FLAVIO).reduce((t, c) => t + (c.votos || 0), 0);
  return { aptos: num(e.apuradas) || num(e.apto), comparecimento: num(e.comparecimento), abstencao: num(e.abstencao || d.abstencao), brancos: num(d.brancos), nulos: num(d.nulos), lula, flavio, outros, validos: num(d.votosValidos) || lula + flavio + outros, pct: num(d.pctSecoes) };
}

/** A partir de uma linha do arquivo presidente-tN-municipios.json (ordem em "colunas"). */
export function linhaDeArquivo(a) {
  const [, , aptos, comparecimento, abstencao, brancos, nulos, lula, flavio, outros, validos, pct] = a;
  return { aptos, comparecimento, abstencao, brancos, nulos, lula, flavio, outros, validos, pct };
}

/** A partir de uma linha de presidente-tN-exterior.json (nome, aptos, comparecimento, abstenção, brancos, nulos, Lula, Flávio, outros, válidos, %). */
export function linhaDeExterior(a) {
  const [, aptos, comparecimento, abstencao, brancos, nulos, lula, flavio, outros, validos, pct] = a;
  return { aptos, comparecimento, abstencao, brancos, nulos, lula, flavio, outros, validos, pct };
}

/** Não voto = abstenções + brancos + nulos. */
export const naoVoto = (l) => (l ? l.abstencao + l.brancos + l.nulos : 0);

/** Votos de uma das quatro linhas (Lula, Flávio, outros, não voto). */
export const votosDe = (l, chave) => (!l ? null : chave === "naovoto" ? naoVoto(l) : l[chave]);

/**
 * % de cada linha. Base "aptos": tudo sobre os eleitores aptos das seções apuradas (soma 100% com o não voto).
 * Base "validos": candidatos sobre os votos válidos; o não voto continua sobre os aptos (brancos, nulos e abstenções não são votos válidos).
 */
export function percentual(l, chave, base) {
  if (!l) return null;
  const v = votosDe(l, chave);
  const den = chave === "naovoto" || base === "aptos" ? l.aptos : l.validos;
  return den > 0 ? (v / den) * 100 : null;
}

/** As quatro linhas lado a lado: votos e % em cada turno e a variação. l2 pode ser nula (2º turno ainda sem dados). */
export function compararLinhas(l1, l2, base = "aptos") {
  return LINHAS.map(([chave, nome]) => {
    const v1 = votosDe(l1, chave), v2 = votosDe(l2, chave), p1 = percentual(l1, chave, base), p2 = percentual(l2, chave, base);
    return { chave, nome, v1, v2, p1, p2, dv: v1 != null && v2 != null ? v2 - v1 : null, dp: p1 != null && p2 != null ? p2 - p1 : null, semNoTurno2: chave === "outros" && l2 && l2.outros === 0 && (v1 ?? 0) > 0 };
  });
}

/** Quem liderou (entre Lula, Flávio e os outros juntos): "L", "F" ou "O". */
export const lider = (l) => (!l ? null : l.lula >= l.flavio && l.lula >= l.outros ? "L" : l.flavio >= l.outros ? "F" : "O");

/** Categoria de "quem liderou" nos dois turnos: 0 Lula nos dois, 1 Flávio nos dois, 2 virou para Flávio, 3 virou para Lula, 4 outros. */
export function categoriaLider(l1, l2) {
  const a = lider(l1), b = lider(l2);
  if (!a || !b) return null;
  if (a === "L" && b === "L") return 0;
  if (a === "F" && b === "F") return 1;
  if (a === "L" && b === "F") return 2;
  if (a === "F" && b === "L") return 3;
  return b === "L" ? 3 : b === "F" ? 2 : 4;
}
export const CATEGORIAS_LIDER = ["Lula nos dois turnos", "Flávio nos dois turnos", "Virou para Flávio", "Virou para Lula", "Outro"];

/** O número que o mapa pinta em cada município, conforme a linha e a medida escolhidas. */
export function valorDoMapa(l1, l2, { linha, medida, base }) {
  if (medida === "lider") return categoriaLider(l1, l2);
  if (medida === "p1") return percentual(l1, linha, base);
  if (medida === "p2") return percentual(l2, linha, base);
  if (!l1 || !l2) return null;
  if (medida === "votos") return votosDe(l2, linha) - votosDe(l1, linha);
  const a = percentual(l1, linha, base), b = percentual(l2, linha, base);
  return a == null || b == null ? null : b - a;
}

/** Classes de cor (0 a 4) dos valores. Variação: duas faixas abaixo de zero, uma neutra e duas acima; níveis: quintis. */
export function classesDoMapa(valores, medida) {
  if (medida === "lider") return { classe: (v) => v, cortes: [], tipo: "lider" };
  const itens = valores.filter((v) => v != null).map((v) => ({ valor: 0, fora: false, taxa: v, acima: v }));
  return classesDeCor(itens, medida === "pp" || medida === "votos" ? "acima" : "taxa");
}

/** Maiores altas (dir "alta") ou quedas ("queda") entre os municípios, pelo valor do mapa. */
export function extremos(itens, dir, limite = 15) {
  return itens.filter((i) => i.valor != null).slice().sort((a, b) => (dir === "alta" ? b.valor - a.valor : a.valor - b.valor) || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, limite);
}

// ---------- exterior por país ----------
/** Soma várias linhas (cidades) em uma só. */
export function somarLinhas(linhas) {
  const ls = linhas.filter(Boolean);
  if (!ls.length) return null;
  const z = { aptos: 0, comparecimento: 0, abstencao: 0, brancos: 0, nulos: 0, lula: 0, flavio: 0, outros: 0, validos: 0 };
  for (const l of ls) for (const k of Object.keys(z)) z[k] += l[k] || 0;
  return { ...z, pct: Math.min(...ls.map((l) => l.pct ?? 100)) };
}

/**
 * Agrupa as localidades do exterior (cidades das representações brasileiras) por país.
 * @param {Map<string,object>} t1 cód. da localidade -> linha do 1º turno  @param {Map<string,object>|null} t2 o mesmo no 2º turno
 * @param {Object<string,[string,string]>} paises cód. da localidade -> [cidade, país]
 */
export function agruparPorPais(t1, t2, paises) {
  const mapa = new Map();
  for (const [cod, [cidade, pais]] of Object.entries(paises)) {
    const g = mapa.get(pais) ?? { pais, cidades: [] };
    g.cidades.push({ cod, nome: cidade, l1: t1?.get(cod) ?? null, l2: t2?.get(cod) ?? null });
    mapa.set(pais, g);
  }
  return [...mapa.values()].map((g) => ({
    ...g, l1: somarLinhas(g.cidades.map((c) => c.l1)), l2: somarLinhas(g.cidades.map((c) => c.l2)),
    parcial2: (g.cidades.some((c) => c.l1 && !c.l2) && g.cidades.some((c) => c.l2)) || g.cidades.some((c) => c.l2 && c.l2.pct < 100), // só parte das cidades (ou das urnas de uma cidade) já tem o 2º turno
  })).filter((g) => g.l1);
}

/** Valor de ordenação de um país: eleitores, % de um candidato no 2º turno ou a variação dele. */
export function valorDeOrdem(g, ordem, base) {
  const [tipo, linha] = ordem.split(":");
  if (tipo === "aptos") return g.l1?.aptos ?? 0;
  if (tipo === "p2") return percentual(g.l2, linha, base) ?? -Infinity;
  if (tipo === "dp") { const a = percentual(g.l1, linha, base), b = percentual(g.l2, linha, base); return a == null || b == null ? -Infinity : b - a; }
  return percentual(g.l1, linha, base) ?? -Infinity;
}
