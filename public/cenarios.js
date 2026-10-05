// Cenários "e se...": recalculam a bancada da Câmara com uma regra ou um arranjo diferente. Nada aqui é resultado oficial.
import { distribuirEstado, consolidarNacional } from "./proporcional.js";
import { REGRAS_2026 } from "./quociente.js";

/** Regras sem nenhum mínimo individual: sem os 10% do quociente (art. 108) e sem os 20% das sobras; só o quociente partidário e as maiores médias. */
export const REGRAS_SEM_MINIMO_INDIVIDUAL = { minCandidatoPrimeiraEtapa: 0, minPartidoSobras: 0, minCandidatoSobras: 0, ultimaRodadaLivre: false };

const partes = (sigla) => String(sigla ?? "").split("/").map((x) => x.trim().toUpperCase());
/** O rótulo (partido ou federação) tem este partido entre os seus componentes? */
export const contem = (sigla, partido) => partes(sigla).includes(String(partido).toUpperCase());

/** Junta dois ou mais partidos/federações de um estado em uma só (votos somados, candidatos juntos). Sem eles no estado, devolve o resultado igual. */
export function unirNoEstado(d, termos, rotulo) {
  const alvo = d.partidos.filter((p) => termos.some((t) => contem(p.sigla, t)));
  if (alvo.length < 2) return d; // só um dos lados disputou neste estado: nada a unir
  const juntos = {
    id: "uniao:" + alvo.map((p) => p.id).join("+"), nome: rotulo, nomeCompleto: rotulo, sigla: rotulo, federacao: true,
    votosNominais: alvo.reduce((t, p) => t + (p.votosNominais || 0), 0), votosLegenda: alvo.reduce((t, p) => t + (p.votosLegenda || 0), 0),
    votos: alvo.reduce((t, p) => t + p.votos, 0), votosSJ: alvo.reduce((t, p) => t + (p.votosSJ || 0), 0), vagasTse: null,
    candidatos: alvo.flatMap((p) => p.candidatos).sort((a, b) => b.votos - a.votos),
  };
  return { ...d, partidos: [...d.partidos.filter((p) => !alvo.includes(p)), juntos], totalizacaoFinal: false };
}

/** Os estados recalculados em um cenário: `uniao` = { termos, rotulo } e/ou `regras`. */
export function recalcularEstados(estados, { uniao = null, regras = REGRAS_2026 } = {}, semSubJudice = false) {
  return (estados ?? []).map(({ uf, d }) => {
    const dc = uniao ? unirNoEstado(d, uniao.termos, uniao.rotulo) : d;
    return { uf, d: dc, dist: distribuirEstado(dc, regras, 0, semSubJudice) };
  });
}

/** Rótulo da bancada no cenário: os que foram unidos viram um só. */
export const rotuloNoCenario = (rotulo, uniao) => (uniao && uniao.termos.some((t) => contem(rotulo, t)) ? uniao.rotulo : rotulo);

/**
 * Compara a bancada de antes e a do cenário, por grupo (partido ou federação).
 * `senado` = [{rotulo, total}] opcional: soma os senadores de 2027 (que não mudam) ao total do Congresso.
 */
export function compararBancadas(base, cenario, { uniao = null, senado = [] } = {}) {
  const nb = consolidarNacional(base), nc = consolidarNacional(cenario);
  const mapa = new Map();
  const linha = (rotulo) => mapa.get(rotulo) ?? (mapa.set(rotulo, { rotulo, antes: 0, depois: 0, senado: 0, porUfAntes: {}, porUfDepois: {} }), mapa.get(rotulo));
  for (const p of nb.partidos) { const l = linha(rotuloNoCenario(p.sigla, uniao)); l.antes += p.vagas; for (const [u, q] of Object.entries(p.porUF)) l.porUfAntes[u] = (l.porUfAntes[u] ?? 0) + q; }
  for (const p of nc.partidos) { const l = linha(p.sigla); l.depois += p.vagas; for (const [u, q] of Object.entries(p.porUF)) l.porUfDepois[u] = (l.porUfDepois[u] ?? 0) + q; }
  for (const s of senado) linha(rotuloNoCenario(s.rotulo, uniao)).senado += s.total;
  const linhas = [...mapa.values()].map((l) => ({ ...l, delta: l.depois - l.antes, congresso: l.depois + l.senado }))
    .sort((a, b) => b.depois - a.depois || b.antes - a.antes || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  return { linhas, totalAntes: nb.total, totalDepois: nc.total, nacionalAntes: nb, nacionalDepois: nc };
}

/** Estados em que a distribuição mudou: [{uf, mudancas:[{rotulo, delta}]}]. */
export function mudancasPorEstado(base, cenario, { uniao = null } = {}) {
  const out = [];
  const bc = new Map(cenario.map((e) => [e.uf, e]));
  for (const { uf, dist } of base) {
    const dc = bc.get(uf)?.dist; if (!dc) continue;
    const m = new Map();
    for (const l of dist.linhas) m.set(rotuloNoCenario(l.sigla, uniao), (m.get(rotuloNoCenario(l.sigla, uniao)) ?? 0) - l.vagas);
    for (const l of dc.linhas) m.set(l.sigla, (m.get(l.sigla) ?? 0) + l.vagas);
    const mudancas = [...m].filter(([, d]) => d !== 0).map(([rotulo, delta]) => ({ rotulo, delta })).sort((a, b) => b.delta - a.delta);
    if (mudancas.length) out.push({ uf, mudancas });
  }
  return out.sort((a, b) => a.uf.localeCompare(b.uf));
}

/** Candidatos que passam a ser eleitos e os que deixam de ser, no cenário. */
export function candidatosQueMudam(base, cenario) {
  const entram = [], saem = [];
  const bc = new Map(cenario.map((e) => [e.uf, e]));
  for (const { uf, d, dist } of base) {
    const nova = bc.get(uf); if (!nova) continue;
    const antes = new Set(dist.eleitos.map((e) => e.id)), depois = new Set(nova.dist.eleitos.map((e) => e.id));
    const dados = new Map([...d.candidatos, ...nova.d.candidatos].map((c) => [c.id, c]));
    const fmt = (id, via) => { const c = dados.get(id), e = (via ?? []).find((x) => x.id === id); return { uf, id, nome: c?.nome ?? id, partido: c?.partido ?? "", votos: c?.votos ?? e?.votos ?? 0 }; };
    for (const id of depois) if (!antes.has(id)) entram.push(fmt(id, nova.dist.eleitos));
    for (const id of antes) if (!depois.has(id)) saem.push(fmt(id, dist.eleitos));
  }
  const ordem = (a, b) => b.votos - a.votos;
  return { entram: entram.sort(ordem), saem: saem.sort(ordem) };
}

export const CENARIOS = {
  "psol-pt": {
    titulo: "PSOL na federação do PT",
    pergunta: "E se o PSOL (com a Rede, sua federação) fosse da mesma federação que o PT, o PCdoB e o PV?",
    descricao: "As duas federações viram uma só em todos os estados: os votos de legenda e de candidatos são somados, o quociente partidário e as sobras são recalculados e dentro da federação elege quem tem mais votos.",
    uniao: { termos: ["PT", "PSOL"], rotulo: "PCDOB / PT / PV / PSOL / REDE" },
    regras: REGRAS_2026,
  },
  "pdt-psol-rede-pt": {
    titulo: "PDT, PSOL e Rede com o PT",
    pergunta: "E se o PDT, o PSOL e a Rede estivessem todos na federação do PT (com PCdoB e PV)?",
    descricao: "Uma federação única de PT, PCdoB, PV, PSOL, Rede e PDT em todos os estados: os votos são somados, o quociente partidário e as sobras são recalculados para o conjunto e dentro dele elege quem tem mais votos.",
    uniao: { termos: ["PT", "PSOL", "REDE", "PDT"], rotulo: "PCDOB / PT / PV / PSOL / REDE / PDT" },
    regras: REGRAS_2026,
  },
  "sem-minimo": {
    titulo: "Sem mínimo individual",
    pergunta: "E se não houvesse regra de desempenho mínimo individual?",
    descricao: "Sem os 10% do quociente eleitoral para o candidato (art. 108) e sem os 20% das sobras: as cadeiras de cada partido vão para os mais votados da lista, qualquer que seja a votação. O quociente partidário e as maiores médias seguem como hoje.",
    uniao: null,
    regras: REGRAS_SEM_MINIMO_INDIVIDUAL,
  },
};
