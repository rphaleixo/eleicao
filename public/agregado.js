import { getBase } from "./base.js";
// Soma o resultado de vários locais (estados de uma região) em um único resultado, no mesmo
// formato de normalizar() em tse.js, para mostrar uma região como se fosse uma "eleição".
/** O mais recente de vários "dd/mm/aaaa hh:mm:ss". */
export function maisRecente(textos) {
  const valor = (t) => { const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(t || "").trim()); return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : -1; };
  return textos.filter(Boolean).reduce((a, t) => (valor(t) > valor(a) ? t : a), "");
}

export function agregarResultados(lista) {
  const ds = lista.filter(Boolean);
  if (!ds.length) return null;
  const mapa = new Map();
  for (const d of ds) for (const c of d.candidatos) {
    const m = mapa.get(c.numero) ?? { ...c, votos: 0, pct: 0, eleito: false, situacao: "", sit: "" }; // a situação de cada estado não vale para a região
    m.votos += c.votos; mapa.set(c.numero, m);
  }
  const soma = (campo) => ds.reduce((s, d) => s + (d[campo] || 0), 0);
  const votosValidos = soma("votosValidos");
  const candidatos = [...mapa.values()].sort((x, y) => y.votos - x.votos || Number(x.numero) - Number(y.numero));
  const apuradas = ds.reduce((t, d) => t + (d.eleitorado?.apuradas || 0), 0);
  for (const c of candidatos) {
    c.pctValido = votosValidos ? (c.votos / votosValidos) * 100 : 0;
    c.pctTotal = apuradas ? (c.votos / apuradas) * 100 : null;
    c.pct = getBase() === "totais" && c.pctTotal != null ? c.pctTotal : c.pctValido;
  }
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
    atualizadoEm: maisRecente(ds.map((d) => d.atualizadoEm)),
  };
}
