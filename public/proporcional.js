// Cadeiras por partido/federação em eleições proporcionais, por estado e no Brasil.
import { distribuirCadeiras, REGRAS_2026, REGRAS_CODIGO_LITERAL, REGRAS_STF_2024 } from "./quociente.js";

/**
 * Distribui as cadeiras de um estado a partir do arquivo normalizado do TSE.
 * @param {object} d resultado de normalizar()
 * @param {"2026"|"codigo"|"variante"} modo regra das sobras (padrão: regra de 2026, em duas rodadas)
 * @param {number} vagasManual se informado, substitui o número de vagas do arquivo
 */
export function distribuirEstado(d, modo = "2026", vagasManual = 0) {
  const vagas = vagasManual || d.vagas;
  const regras = modo === "variante" ? REGRAS_STF_2024 : modo === "codigo" ? REGRAS_CODIGO_LITERAL : REGRAS_2026;
  const entrada = d.partidos.map((p) => ({
    id: p.id, nome: p.sigla || p.nome, votos: p.votos,
    candidatos: p.candidatos.map((c) => ({ id: c.id, nome: c.nome, votos: c.votos, elegivel: c.elegivel })),
  }));
  const r = distribuirCadeiras(vagas, entrada, regras);

  const somaOficial = d.partidos.reduce((s, p) => s + (p.vagasTse || 0), 0);
  const oficial = d.totalizacaoFinal && vagas === d.vagas && somaOficial === d.vagas;

  const linhas = r.partidos.map((p) => {
    const orig = d.partidos.find((x) => x.id === p.id);
    const porQuociente = p.eleitos.filter((e) => e.via === "quociente").length;
    return {
      id: p.id, sigla: orig.sigla || orig.nome, nome: orig.nomeCompleto, federacao: orig.federacao,
      votos: p.votos, pctVotos: r.votosValidos ? (p.votos / r.votosValidos) * 100 : 0,
      projecao: p.eleitos.length, porQuociente, porSobras: p.eleitos.length - porQuociente, qp: p.qp,
      oficial: orig.vagasTse ?? null,
      vagas: oficial ? orig.vagasTse : p.eleitos.length,
    };
  });
  linhas.sort((a, b) => b.vagas - a.vagas || b.votos - a.votos);
  return {
    vagas, qe: r.qe, votosValidos: r.votosValidos, linhas, eleitos: r.eleitos,
    proximoFora: r.proximoFora, oficial, art111: r.eleitos.some((e) => e.via === "art. 111"),
  };
}

/**
 * Soma as cadeiras de todos os estados por partido/federação.
 * @param {{uf:string, d:object, dist:object}[]} estados
 */
export function consolidarNacional(estados) {
  const mapa = new Map();
  let total = 0;
  let confirmadasTotal = 0;
  for (const { uf, dist } of estados) {
    for (const l of dist.linhas) {
      if (!l.vagas) continue;
      const m = mapa.get(l.sigla) ?? { sigla: l.sigla, vagas: 0, confirmadas: 0, votos: 0, porUF: {} };
      if (dist.oficial) { m.confirmadas += l.vagas; confirmadasTotal += l.vagas; }
      m.vagas += l.vagas; m.porUF[uf] = (m.porUF[uf] ?? 0) + l.vagas; mapa.set(l.sigla, m);
      total += l.vagas;
    }
    for (const l of dist.linhas) { // votos de todos, mesmo sem cadeira
      const m = mapa.get(l.sigla) ?? { sigla: l.sigla, vagas: 0, confirmadas: 0, votos: 0, porUF: {} };
      m.votos += l.votos; mapa.set(l.sigla, m);
    }
  }
  const partidos = [...mapa.values()].filter((p) => p.vagas > 0).sort((a, b) => b.vagas - a.vagas || b.votos - a.votos);
  const totalVagas = estados.reduce((s, e) => s + e.dist.vagas, 0);
  return {
    total, totalVagas, confirmadasTotal, partidos,
    ufs: estados.map(({ uf, d, dist }) => ({ uf, vagas: dist.vagas, bancadas: dist.linhas.filter((l) => l.vagas > 0).map((l) => ({ sigla: l.sigla, vagas: l.vagas })), pct: d.pctSecoes, oficial: dist.oficial, final: d.totalizacaoFinal })),
  };
}
