// Histórico da evolução da apuração. O TSE publica só o valor atual; para desenhar a
// evolução ao longo do tempo, uma rotina da Cloudflare guarda uma foto a cada minuto.

const num = (v) => Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) || 0;

/** Arquivo de acompanhamento (EA14) -> { br: 12.3, sp: 10.1, ... } com % de seções apuradas. */
export function pontoDeAcompanhamento(ab) {
  const ponto = {};
  for (const a of ab?.abr ?? []) {
    const chave = String(a.cdabr || "").toLowerCase();
    if (chave) ponto[chave] = Math.round(num(a.s?.pst) * 100) / 100;
  }
  return ponto;
}

/** Eleitores que compareceram e se abstiveram nas seções já apuradas: { br: [comp, abst], sp: [...] }. */
export function presencaDeAcompanhamento(ab) {
  const ponto = {};
  for (const a of ab?.abr ?? []) {
    const chave = String(a.cdabr || "").toLowerCase();
    if (chave) ponto[chave] = [Math.round(num(a.e?.c)), Math.round(num(a.e?.a))];
  }
  return ponto;
}

/**
 * Acrescenta uma foto ao histórico só quando algo mudou (economiza gravações).
 * @returns {{historico: object, mudou: boolean}}
 */
export function acrescentar(historico, ponto, agora = Date.now(), maximo = 3000) {
  const h = historico?.pontos ? historico : { pontos: [] };
  const ult = h.pontos[h.pontos.length - 1];
  const igual = ult && JSON.stringify(ult.f) === JSON.stringify(ponto.f) && JSON.stringify(ult.e) === JSON.stringify(ponto.e) && JSON.stringify(ult.p) === JSON.stringify(ponto.p);
  if (igual) return { historico: h, mudou: false };
  const pontos = [...h.pontos, { t: Math.floor(agora / 1000), f: ponto.f, e: ponto.e, ...(ponto.p ? { p: ponto.p } : {}) }];
  return { historico: { pontos: pontos.slice(-maximo) }, mudou: true };
}
