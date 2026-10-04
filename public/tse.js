// Tudo que depende do formato dos arquivos do TSE fica neste arquivo.
// Os nomes de campos abaixo seguem o padrão de 2022 (cand, vap, pvap, pst...)
// e o leitor aceita variações. Se o TSE mudar algo, o ajuste é só aqui.
import { CONFIG, CARGOS } from "./config.js";

const ele6 = () => String(CONFIG.eleicao).padStart(6, "0");
const c4 = (cargo) => String(CARGOS[cargo].cod).padStart(4, "0");

export function urlResultado(cargo, uf, municipio) {
  const base = `/api/ele${CONFIG.ano}/${CONFIG.eleicao}`;
  const e = ele6();
  if (uf === "BR") return `${base}/dados-simplificados/br/br-c${c4(cargo)}-e${e}-r.json`;
  const u = uf.toLowerCase();
  if (municipio) return `${base}/dados/${u}/${u}${municipio}-c${c4(cargo)}-e${e}-v.json`;
  return `${base}/dados-simplificados/${u}/${u}-c${c4(cargo)}-e${e}-r.json`;
}

export const urlMunicipios = () =>
  `/api/ele${CONFIG.ano}/${CONFIG.eleicao}/config/mun-e${ele6()}-cm.json`;

export async function buscarJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 404) throw new Error("Ainda não publicado pelo TSE (404).");
  if (!r.ok) throw new Error(`Erro ${r.status} ao buscar ${url}`);
  return r.json();
}

// "48,43" -> 48.43 ; "57259504" -> 57259504 ; "1.234" -> 1234
export function num(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const pick = (o, ...chaves) => {
  for (const k of chaves) if (o && o[k] != null) return o[k];
  return undefined;
};

function lerCandidato(c, agrupamento) {
  return {
    id: String(pick(c, "sqcand", "seq", "n") ?? Math.random()),
    numero: String(pick(c, "n", "num") ?? ""),
    nome: pick(c, "nm", "nmu", "nome") ?? "",
    partido: agrupamento?.nome ?? pick(c, "cc", "sg", "partido") ?? "",
    votos: num(pick(c, "vap", "vv", "v", "nv")),
    pct: num(pick(c, "pvap", "pvv", "pv")),
    eleito: /^(s|eleito)/i.test(String(pick(c, "e") ?? "")) || /^eleito/i.test(String(c.st ?? "")),
    situacao: c.st ?? "",
  };
}

/** Normaliza qualquer arquivo de resultado para um formato único. */
export function normalizar(json) {
  const cargos = json.carg ?? json.cargos;
  const bloco = Array.isArray(cargos) ? cargos[0] : json;
  const listaAgr = bloco?.agr ?? json.agr;

  const partidos = [];
  let candidatos = [];

  if (Array.isArray(listaAgr) && listaAgr.length) {
    for (const a of listaAgr) {
      const agr = {
        id: String(pick(a, "n", "cd", "sg") ?? a.nm),
        nome: pick(a, "nm", "sg", "ds") ?? "",
        votosLegenda: num(pick(a, "tvtl", "vl")),
        votosNominais: num(pick(a, "tvtn", "vn")),
        votos: num(pick(a, "tvt", "vap", "vv")),
        candidatos: (a.cand ?? []).map((c) => lerCandidato(c, { nome: pick(a, "nm", "sg", "ds") })),
      };
      if (!agr.votos) agr.votos = agr.votosNominais + agr.votosLegenda;
      partidos.push(agr);
      candidatos.push(...agr.candidatos);
    }
  } else {
    candidatos = (bloco?.cand ?? json.cand ?? []).map((c) => lerCandidato(c));
  }

  candidatos.sort((a, b) => b.votos - a.votos);

  return {
    pctSecoes: num(pick(json, "pst", "psec")),
    secoesApuradas: num(pick(json, "st", "ssc")),
    secoesTotal: num(pick(json, "s", "ts")),
    votosValidos: num(pick(json, "vv", "tvv")),
    brancos: num(pick(json, "vb")),
    nulos: num(pick(json, "vn", "tvn")),
    pctBrancos: num(pick(json, "pvb")),
    pctNulos: num(pick(json, "pvn", "ptvn")),
    atualizadoEm: [json.dg, json.hg].filter(Boolean).join(" "),
    candidatos,
    partidos,
  };
}

export function lerMunicipios(json) {
  const out = {};
  for (const a of json.abr ?? []) {
    const uf = String(a.cd ?? "").toUpperCase();
    out[uf] = (a.mu ?? [])
      .map((m) => ({ cod: String(m.cd), nome: m.nm }))
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  }
  return out;
}
