// Distribuição de cadeiras em eleições proporcionais (deputados).
// Base legal: Código Eleitoral arts. 106 a 111 (redação da Lei 14.211/2021),
// com a interpretação do STF (ADIs 7228, 7263 e 7325, fev/2024) sobre as sobras.
//
// Os partidos já chegam agrupados: federação conta como um único partido.

// Regra de 2026 (Código Eleitoral com as decisões do STF incorporadas pelo TSE):
// as sobras têm duas rodadas. Na 1ª, só concorrem partidos com 80% do quociente e
// candidatos com 20%. Se ainda restarem vagas, a última rodada é livre dessas exigências.
export const REGRAS_2026 = {
  minCandidatoPrimeiraEtapa: 0.1,
  minPartidoSobras: 0.8,
  minCandidatoSobras: 0.2,
  ultimaRodadaLivre: true,
};

// Variante sem nenhuma exigência desde a 1ª rodada (usada só em comparações).
export const REGRAS_STF_2024 = {
  minCandidatoPrimeiraEtapa: 0.1, // art. 108: candidato com >= 10% do QE
  minPartidoSobras: 0,            // STF: barreira de 80% não vale nas sobras
  minCandidatoSobras: 0,          // STF: barreira de 20% não vale nas sobras
};

export const REGRAS_CODIGO_LITERAL = {
  minCandidatoPrimeiraEtapa: 0.1,
  minPartidoSobras: 0.8,          // art. 109, redação da Lei 14.211
  minCandidatoSobras: 0.2,
};

// Art. 106: fração igual ou inferior a meio é desprezada; superior, vira um.
export function quocienteEleitoral(votosValidos, vagas) {
  if (!vagas) return 0;
  const q = votosValidos / vagas;
  const inteiro = Math.floor(q);
  return q - inteiro > 0.5 ? inteiro + 1 : inteiro;
}

/**
 * @param {number} vagas
 * @param {{id:string, nome:string, votosLegenda?:number,
 *          candidatos:{id:string, nome:string, votos:number, elegivel?:boolean}[]}[]} partidos
 * @param {object} regras
 */
export function distribuirCadeiras(vagas, partidos, regras = REGRAS_2026) {
  const ps = partidos.map((p) => {
    // Candidato sub judice, anulado ou indeferido (elegivel === false) tem os votos
    // somados ao partido, mas não pode ser eleito: sai da lista de quem disputa a vaga.
    const candidatos = p.candidatos
      .filter((c) => c.elegivel !== false)
      .sort((a, b) => b.votos - a.votos);
    const nominais = p.candidatos.reduce((s, c) => s + c.votos, 0);
    return {
      id: p.id,
      nome: p.nome,
      candidatos,
      votos: p.votos ?? nominais + (p.votosLegenda || 0),
      eleitos: [],
      qp: 0,
    };
  });

  const votosValidos = ps.reduce((s, p) => s + p.votos, 0);
  const qe = quocienteEleitoral(votosValidos, vagas);
  const resultado = { vagas, votosValidos, qe, partidos: ps, eleitos: [], sobras: [], barrados: [] };
  if (!qe) return resultado;

  // Etapa 1 (arts. 107 e 108): quociente partidário e candidatos com >= 10% do QE.
  for (const p of ps) {
    p.qp = Math.floor(p.votos / qe);
    const minimo = qe * regras.minCandidatoPrimeiraEtapa;
    const aptos = p.candidatos.filter((c) => c.votos >= minimo);
    const n = Math.min(p.qp, aptos.length);
    p.eleitos = aptos.slice(0, n).map((c) => ({ ...c, via: "quociente" }));
    // Barrados: o partido tinha cadeira pelo quociente partidário, mas estes candidatos, que ocupariam a vaga pela ordem de votos,
    // ficaram abaixo de 10% do quociente eleitoral (art. 108) e não podem ser eleitos. A cadeira vai para as sobras.
    p.barrados = p.candidatos.slice(aptos.length, p.qp).filter((c) => c.votos > 0).map((c) => ({ ...c, minimo: Math.ceil(minimo), faltam: Math.max(1, Math.ceil(minimo) - c.votos) }));
    p.cadeirasSemCandidato = Math.max(0, p.qp - aptos.length); // vagas do quociente partidário que o partido não conseguiu preencher
  }

  // Proteção contra arredondamento para baixo do QE gerar mais cadeiras que vagas.
  let ocupadas = ps.reduce((s, p) => s + p.eleitos.length, 0);
  while (ocupadas > vagas) {
    const p = ps
      .filter((x) => x.eleitos.length)
      .sort((a, b) => a.votos / a.eleitos.length - b.votos / b.eleitos.length)[0];
    p.eleitos.pop();
    ocupadas--;
  }

  // Art. 111: se nenhum partido ou federação alcançar o quociente eleitoral, os lugares são
  // preenchidos pelos candidatos mais votados, sem considerar partido.
  if (ocupadas === 0 && ps.every((p) => p.qp === 0)) {
    const todos = ps
      .flatMap((p) => p.candidatos.map((c) => ({ ...c, p })))
      .filter((c) => c.votos > 0)
      .sort((a, b) => b.votos - a.votos)
      .slice(0, vagas);
    for (const c of todos) {
      c.p.eleitos.push({ id: c.id, nome: c.nome, votos: c.votos, via: "art. 111" });
      ocupadas++;
    }
  }

  // Etapa 2 (art. 109): sobras pelo maior número de votos por (cadeiras + 1), em rodadas.
  const LIVRE = { minPartidoSobras: 0, minCandidatoSobras: 0 };
  const rodadas = [regras];
  if (regras.ultimaRodadaLivre) rodadas.push(LIVRE);
  const proximo = (p, rg) => {
    if (p.votos < qe * rg.minPartidoSobras) return null;
    const minimo = qe * rg.minCandidatoSobras;
    return p.candidatos.slice(p.eleitos.length).find((c) => c.votos >= minimo) || null;
  };

  rodadas.forEach((rg, i) => {
    while (ocupadas < vagas) {
      let melhor = null;
      for (const p of ps) {
        const cand = proximo(p, rg);
        if (!cand) continue;
        const media = p.votos / (p.eleitos.length + 1);
        if (!melhor || media > melhor.media || (media === melhor.media && p.votos > melhor.p.votos)) {
          melhor = { p, cand, media };
        }
      }
      if (!melhor) break;
      melhor.p.eleitos.push({ ...melhor.cand, via: "sobra", media: melhor.media, rodada: i + 1 });
      resultado.sobras.push({ partido: melhor.p.id, media: melhor.media, rodada: i + 1 });
      ocupadas++;
    }
  });

  // Quem seria o próximo da fila (primeiro fora): mostra a disputa pela última vaga.
  let proximoFora = null;
  for (const p of ps) {
    const cand = proximo(p, LIVRE);
    if (!cand) continue;
    const media = p.votos / (p.eleitos.length + 1);
    if (!proximoFora || media > proximoFora.media) proximoFora = { partido: p.nome, cand, media };
  }
  resultado.proximoFora = proximoFora;

  resultado.barrados = ps.flatMap((p) => p.barrados.map((c) => ({ ...c, partido: p.nome, partidoId: p.id, qp: p.qp })))
    .sort((a, b) => b.votos - a.votos);
  ps.sort((a, b) => b.eleitos.length - a.eleitos.length || b.votos - a.votos);
  resultado.eleitos = ps
    .flatMap((p) => p.eleitos.map((c) => ({ ...c, partido: p.nome })))
    .sort((a, b) => b.votos - a.votos);
  return resultado;
}

// Constituição, art. 27: assembleia = 3x a bancada federal até 12; acima disso, bancada + 24.
export function vagasEstaduais(vagasFederais) {
  return vagasFederais <= 12 ? vagasFederais * 3 : vagasFederais + 24;
}
