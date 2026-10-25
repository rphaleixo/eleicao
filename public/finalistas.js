// Ordem fixa dos finalistas de presidente: Lula (13) sempre à esquerda e Flávio Bolsonaro (22) sempre à direita,
// qualquer que seja o resultado, o turno ou a base. Quem está à frente é dito por texto, nunca pela posição.
export const NUM_LULA = "13", NUM_FLAVIO = "22";

/** Um par de candidatos com Lula e Flávio volta com Lula primeiro; qualquer outro par (governadores…) segue como veio. */
export function ladoFixo(par) {
  if (!Array.isArray(par) || par.length !== 2) return par;
  const [x, y] = par;
  return String(x?.numero) === NUM_FLAVIO && String(y?.numero) === NUM_LULA ? [y, x] : par;
}
