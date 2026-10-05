// Registro das definições da eleição (eleito, 2º turno), com a hora em que cada uma apareceu.
// Usa o mesmo leitor dos arquivos do TSE do site (public/tse.js), para a regra de "eleito" ser uma só.
import { normalizar, num } from "../public/tse.js";
import { UFS_GOVERNO_SEGUNDO_TURNO } from "../public/segundo-turno.js";

export const UFS_ALVO = ["ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to"];
export const CODIGO_CARGO = { presidente: "0001", governador: "0003", senador: "0005" };

/** Todos os arquivos que acompanhamos: Presidente (Brasil), 27 governos e 27 senados. */
export const ALVOS = [
  { id: "presidente:br", cargo: "presidente", uf: "br" },
  ...UFS_ALVO.map((uf) => ({ id: `governador:${uf}`, cargo: "governador", uf })),
  ...UFS_ALVO.map((uf) => ({ id: `senador:${uf}`, cargo: "senador", uf })),
];

const cand = (c) => ({ n: c.nome, p: c.partido, id: c.id });

/** Definições presentes em um resultado já normalizado. */
export function detectarEventos(cargo, uf, d) {
  const cs = d?.candidatos ?? [];
  const eleitos = cs.filter((c) => c.sit === "eleito"), segundos = cs.filter((c) => c.sit === "segundo");
  const ev = [];
  if (cargo === "senador") for (const c of eleitos) ev.push({ k: `senador:${uf}:eleito:${c.id}`, cargo, uf, tipo: "eleito", c: [cand(c)] });
  else {
    if (eleitos.length) ev.push({ k: `${cargo}:${uf}:eleito`, cargo, uf, tipo: "eleito", c: eleitos.slice(0, 1).map(cand) });
    else if (segundos.length) ev.push({ k: `${cargo}:${uf}:segundo`, cargo, uf, tipo: "segundo", c: segundos.map(cand) });
  }
  const fechado = cargo === "senador" ? eleitos.length >= (d?.vagas || 2) : ev.length > 0;
  return { eventos: ev, fechado };
}

/** Acrescenta só o que ainda não estava registrado. `visita` indica se o alvo foi visto pela primeira vez agora. */
export function acrescentarEventos(atual, novos, agora = Date.now(), primeiraVisita = false) {
  const base = atual?.itens ? atual.itens : [];
  const conhecidos = new Set(base.map((e) => e.k));
  const adicionados = novos.filter((e) => !conhecidos.has(e.k)).map((e) => ({ ...e, t: Math.floor(agora / 1000), ...(primeiraVisita ? { a: 1 } : {}) }));
  return { itens: [...base, ...adicionados], mudou: adicionados.length > 0 };
}

/** Os alvos ainda abertos, dos visitados há mais tempo aos mais recentes (revezamento, para limitar as consultas por minuto). */
/** No 2º turno só há Presidente e o governo dos estados com disputa. */
export const alvosDoTurno = (turno) => (turno === 2 ? ALVOS.filter((a) => a.cargo === "presidente" || (a.cargo === "governador" && UFS_GOVERNO_SEGUNDO_TURNO.includes(a.uf.toUpperCase()))) : ALVOS);

export function escolherAlvos(estado, maximo = 16, alvos = ALVOS) {
  const visto = estado?.visto ?? {}, fechado = estado?.fechado ?? {};
  return alvos.filter((a) => !fechado[a.id]).sort((a, b) => (visto[a.id] ?? 0) - (visto[b.id] ?? 0)).slice(0, maximo);
}

export const caminhoAlvo = (a, ano, eleicaoFederal, eleicaoEstadual) => {
  const e = a.cargo === "presidente" ? eleicaoFederal : eleicaoEstadual;
  return `ele${ano}/${e}/dados/${a.uf}/${a.uf}-c${CODIGO_CARGO[a.cargo]}-e00${e}-u.json`;
};

/**
 * Estima quando uma definição aconteceu, para o que já estava definido antes de o registro começar.
 * Aplica o mesmo critério de "definida" do site aos votos de cada minuto, supondo que a proporção entre
 * os candidatos seja a de agora e que os votos contados cresçam com o % de seções apuradas (histórico).
 * Critério: o candidato fica garantido quando seus votos superam os do maior rival somados a todos os
 * eleitores das seções ainda não apuradas (Senado e 2º turno), ou passam de 50% dos votos possíveis (maioria).
 * @param {object} o { tipo, cargo, indice (posição do candidato entre os mais votados), votos[] (ordenados), vv, te, vagas, pctAgora, serie:[{t,pct}] }
 * @returns {number|null} instante (segundos) ou null se o critério não foi atingido no histórico
 */
export function estimarInstante({ tipo, cargo, indice = 0, votos, vv, te, vagas = 1, pctAgora, serie }) {
  if (!pctAgora || !te || !votos?.length) return null;
  for (const { t, pct } of serie) {
    if (!(pct > 0)) continue;
    const k = Math.min(1, pct / pctAgora), restantes = te * (1 - Math.min(100, pct) / 100);
    const v = votos.map((x) => x * k), validos = vv * k;
    let ok;
    if (cargo === "senador") ok = v[indice] > (v[vagas] ?? 0) + restantes;
    else if (tipo === "segundo") ok = v[0] + 0.5 * restantes < 0.5 * validos && v[1] > (v[2] ?? 0) + restantes;
    else ok = v[0] > 0.5 * (validos + restantes);
    if (ok) return t;
  }
  return null;
}

export { normalizar, num };
