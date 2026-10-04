// Soma o resultado de vários locais (estados de uma região) em um único resultado, no mesmo
// formato de normalizar() em tse.js, para mostrar uma região como se fosse uma "eleição".
export function agregarResultados(lista) {
  const ds = lista.filter(Boolean);
  if (!ds.length) return null;
  const mapa = new Map();
  for (const d of ds) for (const c of d.candidatos) {
    const m = mapa.get(c.numero) ?? { ...c, votos: 0, pct: 0, eleito: false, situacao: "" };
    m.votos += c.votos; mapa.set(c.numero, m);
  }
  const soma = (campo) => ds.reduce((s, d) => s + (d[campo] || 0), 0);
  const votosValidos = soma("votosValidos");
  const candidatos = [...mapa.values()].sort((x, y) => y.votos - x.votos || Number(x.numero) - Number(y.numero));
  for (const c of candidatos) c.pct = votosValidos ? (c.votos / votosValidos) * 100 : 0;
  const secoesTotal = soma("secoesTotal"), secoesApuradas = soma("secoesApuradas");
  return {
    cargoNome: ds[0].cargoNome, vagas: ds[0].vagas, candidatos, partidos: [],
    votosValidos, brancos: soma("brancos"), nulos: soma("nulos"),
    secoesTotal, secoesApuradas, pctSecoes: secoesTotal ? (secoesApuradas / secoesTotal) * 100 : 0,
    votos: Object.fromEntries(["total", "nominais", "validos", "nominaisValidos", "legenda", "anulados", "anuladosSubJudice", "brancos", "nulos"].map((k) => [k, ds.reduce((t, d) => t + (d.votos?.[k] || 0), 0)])),
    eleitorado: Object.fromEntries(["apto", "apuradas", "comparecimento", "abstencao"].map((k) => [k, ds.reduce((t, d) => t + (d.eleitorado?.[k] || 0), 0)])),
    comparecimento: soma("comparecimento"), abstencao: soma("abstencao"),
    divulgaVotos: ds.some((d) => d.divulgaVotos), definido: "", semEleito: false, motivosSemEleito: [], totalizacaoFinal: ds.every((d) => d.totalizacaoFinal),
    andamento: ds.every((d) => d.andamento === "f") ? "f" : ds.some((d) => d.andamento !== "n") ? "p" : "n",
    atualizadoEm: "",
  };
}
