// Números digitados nos votos nulos das eleições majoritárias: rótulos, ranking, pontos do mapa (locais de votação e zonas).
// Dados: public/dados/nulos-<uf>.json (somas por zona e município) e nulos-<uf>-mapa.json (locais de votação com coordenadas).

export const CARGOS_NULOS = [["1", "Presidente"], ["3", "Governador"], ["5", "Senador"]];
export const NOME_CARGO = { 1: "presidente", 3: "governador", 5: "senador" };
export const CORES_NUMERO = ["#7b8794", "#d9701c", "#1b7f8c", "#8e5bd6", "#d4a300", "#d6477b"]; // 6 números mais frequentes; os demais usam OUTROS
export const COR_OUTROS = "#b9c0cc";

/**
 * O que significa um número digitado num voto nulo.
 * tipo: "zero" (nulo deliberado), "partido-sem-candidato" (número de partido que não tem candidato neste cargo),
 *       "partido-numero-errado" (começa com o número de um partido, mas não é de nenhum candidato), "candidato" (repetição), "outro".
 */
export function rotuloNumero(dig, cargo, nomes) {
  const cand = nomes?.candidatos?.[cargo] ?? {}, partidos = nomes?.partidos ?? {};
  if (/^0+$/.test(dig)) return { tipo: "zero", texto: "Zeros (nulo proposital)" };
  if (cand[dig]) return { tipo: "candidato", texto: cand[dig] };
  const sigla = partidos[dig.slice(0, 2)];
  if (sigla) {
    const temCandidato = Object.keys(cand).some((n) => n.startsWith(dig.slice(0, 2)));
    const cargoNome = NOME_CARGO[cargo];
    return temCandidato
      ? { tipo: "partido-numero-errado", texto: `Começa com o número do ${sigla}, mas ${dig} não é de nenhum candidato`, sigla }
      : { tipo: "partido-sem-candidato", texto: `Número do ${sigla}, que não tem candidato a ${cargoNome}`, sigla };
  }
  return { tipo: "outro", texto: "Não é número de nenhum partido ou candidato" };
}

/** Ranking de números do estado (ou de um município/zona), com % do total de nulos digitados. */
export function rankingNumeros(total, cargo, nomes, { limite = 20 } = {}) {
  const lista = total?.[cargo]?.nulos ?? [], soma = lista.reduce((t, [, q]) => t + q, 0);
  const itens = lista.map(([dig, qtd]) => ({ dig, qtd, pct: soma ? (qtd / soma) * 100 : 0, ...rotuloNumero(dig, cargo, nomes) }));
  const por = (tipo) => itens.filter((i) => i.tipo === tipo).reduce((t, i) => t + i.qtd, 0);
  return {
    itens: itens.slice(0, limite), total: soma,
    zero: por("zero"), semCandidato: por("partido-sem-candidato"), numeroErrado: por("partido-numero-errado"),
    repeticao: (total?.[cargo]?.repeticao ?? []).slice(0, 10).map(([dig, qtd]) => ({ dig, qtd, ...rotuloNumero(dig, cargo, nomes) })),
  };
}

/**
 * Pontos do mapa. visao "locais": um ponto por local de votação (conjunto de urnas); "zonas": um ponto por zona eleitoral,
 * no centro dos locais dela, com os números completos da zona. `numero`: "" = o número mais frequente em cada ponto.
 */
export function pontosDoMapa(mapa, resumo, cargo, { visao = "locais", numero = "", municipio = "" } = {}) {
  const topo = mapa.topo[cargo], idx = numero ? topo.indexOf(numero) : -1;
  const locais = mapa.locais.filter((l) => !municipio || l.m === municipio);
  const montar = (base, n, contagens, top3) => {
    let dig, qtd;
    if (numero) { dig = numero; qtd = idx >= 0 ? contagens[idx] : (top3.find(([d]) => d === numero)?.[1] ?? 0); }
    else { [dig, qtd] = top3[0] ?? ["", 0]; }
    const cor = numero ? null : (topo.indexOf(dig) >= 0 && topo.indexOf(dig) < CORES_NUMERO.length ? CORES_NUMERO[topo.indexOf(dig)] : COR_OUTROS);
    return { ...base, n, dig, qtd, share: n ? (qtd / n) * 100 : 0, cor, top3 };
  };
  if (visao === "zonas") {
    const grupos = new Map();
    for (const l of locais) {
      const k = `${l.m}/${l.z}`, g = grupos.get(k) ?? { m: l.m, mn: l.mn, z: l.z, u: 0, la: 0, lo: 0 };
      g.u += l.u; g.la += l.la * l.u; g.lo += l.lo * l.u; grupos.set(k, g);
    }
    return [...grupos.values()].map((g) => {
      const z = resumo.municipios[g.m]?.zonas?.[g.z]?.total?.[cargo]?.nulos ?? [];
      const n = z.reduce((t, [, q]) => t + q, 0), por = new Map(z);
      const contagens = topo.map((d) => por.get(d) ?? 0);
      return montar({ tipo: "zona", id: `${g.m}/${g.z}`, nome: `Zona ${Number(g.z)} · ${g.mn}`, m: g.m, mn: g.mn, z: g.z, u: g.u, la: g.la / g.u, lo: g.lo / g.u }, n, contagens, z.slice(0, 3));
    }).filter((p) => p.n > 0);
  }
  return locais.map((l, i) => {
    const [n, contagens, top3] = l.c[cargo];
    return montar({ tipo: "local", id: `${l.m}/${l.z}/${i}`, nome: l.nl, bairro: l.b, m: l.m, mn: l.mn, z: l.z, u: l.u, la: l.la, lo: l.lo }, n, contagens, top3);
  }).filter((p) => p.n > 0);
}

/** Zonas ordenadas pelo que o usuário escolheu: o % do número, ou o total de nulos digitados por urna. */
export function zonasEmDestaque(pontosZonas, numero) {
  return pontosZonas.slice().sort((a, b) => (numero ? b.share - a.share : b.n / b.u - a.n / a.u) || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Escala de cor de uma sequência (claro para escuro) conforme o % do número no ponto. */
export function corPorParticipacao(share, max) {
  const t = max > 0 ? Math.min(1, share / max) : 0;
  const a = [253, 240, 213], b = [168, 80, 31]; // do creme ao marrom
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}
