import { distribuirEstado } from "./proporcional.js";
// Base dos percentuais: "validos" (votos nos candidatos ÷ votos válidos, como o TSE) ou "totais"
// (÷ todos os eleitores aptos das seções apuradas, com brancos, nulos e abstenções como "candidatos").
let atual = "validos";
export const getBase = () => atual;
export const setBase = (b) => { atual = b === "totais" ? "totais" : "validos"; };
// Cenário "sem sub judice" (só na base de votos válidos): desconsidera os votos de candidatos com registro sub judice.
let semSJ = false;
export const setSemSubJudice = (v) => { semSJ = !!v; };
/** O cenário está valendo? (só existe em votos válidos) */
export const semSubJudice = () => semSJ && atual === "validos";
export const ehSubJudice = (c) => !!c?.subJudice;

export const ROTULO_BASE = { validos: "dos válidos", totais: "dos eleitores aptos" };
export const rotuloBase = () => ROTULO_BASE[atual];

/** Base dos votos totais: os eleitores aptos das seções já apuradas (comparecimento + abstenção). */
export const baseTotal = (d) => d?.eleitorado?.apuradas || 0;

/** Brancos, nulos, abstenções e a soma dos três ("não voto"), com os % sobre a base total. */
export function naoVoto(d) {
  const base = baseTotal(d);
  if (!d || !base) return null;
  const brancos = d.brancos || 0, nulos = d.nulos || 0, abstencao = d.abstencao || d.eleitorado?.abstencao || 0;
  const soma = brancos + nulos + abstencao, p = (n) => (n / base) * 100;
  return { base, brancos, nulos, abstencao, soma, pctBrancos: p(brancos), pctNulos: p(nulos), pctAbstencao: p(abstencao), pctSoma: p(soma) };
}

const SINTETICOS = [
  ["__naovoto", "Não voto", "Brancos + nulos + abstenções", "soma"],
  ["__abstencao", "Abstenções", "Eleitores que faltaram", "abstencao"],
  ["__nulos", "Nulos", "Votos nulos", "nulos"],
  ["__brancos", "Brancos", "Votos em branco", "brancos"],
];

/** Os "candidatos" que não são pessoas, para a visão de votos totais. */
export function sinteticos(d) {
  const n = naoVoto(d);
  if (!n) return [];
  return SINTETICOS.map(([id, nome, descricao, campo]) => ({
    id, nome, descricao, numero: "", partido: "", votos: n[campo], pct: n[`pct${campo[0].toUpperCase()}${campo.slice(1)}`], elegivel: true, sit: "", eleito: false, situacao: "", situacaoVoto: "", sintetico: true,
  }));
}

/** Candidatos de verdade (sem os "sintéticos"); no cenário sem sub judice, também sem os candidatos sub judice. */
export const candidatosReais = (d) => (semSubJudice() ? (d?.candidatos ?? []).filter((c) => !c.subJudice) : d?.candidatos ?? []);

/** Candidatos de um resultado na base atual: em votos totais, junta os 4 "candidatos" sintéticos, tudo por votos. */
export function listaCandidatos(d) {
  const cs = d?.candidatos ?? [];
  if (semSubJudice()) return cs.filter((c) => !c.subJudice); // candidatos sub judice saem da lista
  if (atual !== "totais") return cs;
  return [...cs, ...sinteticos(d)].sort((a, b) => b.votos - a.votos || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

/** Ajusta o % de cada candidato à base atual (os dois valores ficam guardados no candidato). */
export function aplicarBase(d) {
  if (!d?.candidatos) return;
  const sj = semSubJudice();
  if (d.votosValidosTSE == null) d.votosValidosTSE = d.votosValidos;
  d.votosValidos = sj && d.votosSemSJ != null ? d.votosSemSJ : d.votosValidosTSE;
  for (const c of d.candidatos) {
    if (c.pctValido == null) c.pctValido = c.pct;
    if (c.sitTSE === undefined) { c.sitTSE = c.sit; c.projetadaTSE = !!c.sitProjetada; }
    c.pct = sj && c.pctSemSJ != null ? c.pctSemSJ : atual === "totais" && c.pctTotal != null ? c.pctTotal : c.pctValido;
    c.sit = sj && c.sitSemSJ !== undefined ? c.sitSemSJ : c.sitTSE;
    c.sitProjetada = sj ? !!c.sitProjetadaSJ : c.projetadaTSE;
  }
}

const SEM_DIST = Symbol("semSJ"); // marca em que cenário a distribuição de cadeiras guardada foi calculada
const PULAR = new Set(["h", "rp", "mandatos", "malha", "municipios", "ac", "e", "f"]);
/** Aplica a base em todos os resultados de uma tela (d, du, lista, detalhe...). */
export function aplicarBaseNaView(v, visto = new Set()) {
  if (!v || typeof v !== "object" || visto.has(v)) return;
  visto.add(v);
  if (Array.isArray(v)) { for (const x of v) aplicarBaseNaView(x, visto); return; }
  if (Array.isArray(v.candidatos)) { aplicarBase(v); return; }
  if (v.d && v.dist && Array.isArray(v.d.candidatos) && v.d.partidos) { // eleição proporcional: as cadeiras seguem o cenário
    aplicarBase(v.d);
    const sj = semSubJudice();
    if (v[SEM_DIST] !== sj) { v.distTSE ??= v.dist; v.dist = sj ? distribuirEstado(v.d, "2026", 0, true) : v.distTSE; v[SEM_DIST] = sj; }
    return;
  }
  for (const [k, x] of Object.entries(v)) if (!PULAR.has(k)) aplicarBaseNaView(x, visto);
}
