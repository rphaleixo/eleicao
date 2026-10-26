// Vantagem entre dois candidatos: votos (subtração dos totais mostrados) e pontos percentuais (subtração dos percentuais mostrados, com duas casas).
import { fmt } from "./formato.js";

const ptBr = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const duas = (n) => Math.round(Number(n) * 100) / 100;
export const LIMIAR_EMPATE = 0.01; // abaixo disso (p.p.) é empate

/** @returns {{votos:number, pp:number, empate:boolean}|null} diferença de A sobre B; null se faltar algum número. */
export function vantagem(a, b) {
  if (![a?.votos, b?.votos, a?.pct, b?.pct].every(Number.isFinite)) return null;
  const pp = Math.round((duas(a.pct) - duas(b.pct)) * 100) / 100;
  return { votos: a.votos - b.votos, pp, empate: Math.abs(pp) < LIMIAR_EMPATE };
}
export const sinalDe = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");
export const txtVotos = (n) => `${sinalDe(n)}${fmt(Math.abs(n))}`;
export const txtPP = (n) => `${sinalDe(n)}${ptBr(Math.abs(n))} p.p.`;
