// Evolução do resultado da eleição presidencial, minuto a minuto. O TSE publica só o valor
// atual; a rotina agendada guarda uma foto dos votos de cada candidato (Brasil, estados e exterior).

const num = (v) => Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) || 0;

export const UFS_MINUSCULAS = [
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to", "zz",
];

/** Arquivo de resultado do cargo -> { vv: votos válidos, c: { sqcand: votos } } e os nomes dos candidatos. */
export function lerResultado(json) {
  const cargo = (json?.carg ?? [])[0] ?? {};
  const c = {}, nomes = {};
  for (const a of cargo.agr ?? []) for (const p of a.par ?? []) for (const cand of p.cand ?? []) {
    const id = String(cand.sqcand ?? cand.seq ?? cand.n);
    c[id] = num(cand.vap);
    nomes[id] = { n: cand.nmu || cand.nm || "", p: p.sg ?? "" };
  }
  // Base dos percentuais = a do TSE: votos válidos mais os anulados sub judice (vvc), que ainda podem ser validados.
  return { valor: { vv: num(json?.v?.vvc) || num(json?.v?.vv), es: num(json?.e?.est), c }, nomes }; // es = eleitores aptos das seções apuradas (base dos votos totais)
}

/**
 * Acrescenta uma foto só quando algum voto mudou. Enquanto ninguém tiver votos, não grava nada.
 * @param {object|null} atual {cands, pontos}
 * @param {Record<string,{vv:number,c:object}>} v votos por local (br, rj, zz...)
 * @param {Record<string,{n:string,p:string}>} nomes
 */
export function acrescentarResultado(atual, v, nomes, agora = Date.now(), maximo = 2000) {
  const h = atual?.pontos ? atual : { cands: {}, pontos: [] };
  if (!Object.values(v).some((x) => x.vv > 0)) return { historico: h, mudou: false };
  const ult = h.pontos[h.pontos.length - 1];
  const cands = { ...h.cands, ...nomes };
  if (ult && JSON.stringify(ult.v) === JSON.stringify(v)) return { historico: h, mudou: false };
  return { historico: { cands, pontos: [...h.pontos, { t: Math.floor(agora / 1000), v }].slice(-maximo) }, mudou: true };
}
