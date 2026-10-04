// Tudo que depende do formato dos arquivos do TSE fica neste arquivo.
// Formato confirmado em arquivos reais (eleição municipal de 2024, mesmo
// sistema de 2026): carg[] > agr[] (partido/federação) > par[] > cand[].
import { CONFIG, CARGOS } from "./config.js";

const pad6 = (e) => String(e).padStart(6, "0");
const c4 = (cargo) => String(CARGOS[cargo].cod).padStart(4, "0");
const codEleicao = (cargo) =>
  CARGOS[cargo].federal ? CONFIG.eleicaoFederal : CONFIG.eleicaoEstadual;

/**
 * Endereço do arquivo de resultado (EA20, sufixo -u). O TSE bloqueia IPs que
 * geram muitos erros 404, então só montamos endereços que sabemos que existem:
 * Brasil, estado e município (código de município sempre com 5 dígitos).
 */
export function urlsResultado(cargo, uf, municipio) {
  const e = codEleicao(cargo);
  const base = `/api/ele${CONFIG.ano}/${e}`;
  const arq = (sigla) => `${sigla}-c${c4(cargo)}-e${pad6(e)}`;
  if (uf === "BR") return [`${base}/dados/br/${arq("br")}-u.json`];
  const u = uf.toLowerCase();
  if (municipio) return [`${base}/dados/${u}/${arq(u + String(municipio).padStart(5, "0"))}-u.json`];
  return [`${base}/dados/${u}/${arq(u)}-u.json`];
}

/** Andamento de todos os estados (EA14): um arquivo por eleição. Presidente é a eleição federal. */
export function urlAcompanhamento(cargo) {
  const e = codEleicao(cargo);
  return `/api/ele${CONFIG.ano}/${e}/dados/br/br-e${pad6(e)}-ab.json`;
}

export const urlHistorico = () => "/api/historico";

/** Foto do candidato: Presidente fica na pasta "br"; os demais cargos na pasta do estado. */
export function urlFoto(cargo, uf, sqcand) {
  const e = codEleicao(cargo);
  const pasta = cargo === "presidente" || uf === "BR" ? "br" : uf.toLowerCase();
  return `/api/ele${CONFIG.ano}/${e}/fotos/${pasta}/${sqcand}.jpeg`;
}

export const urlMunicipios = (cargo = "governador") =>
  `/api/ele${CONFIG.ano}/${codEleicao(cargo)}/config/mun-e${pad6(codEleicao(cargo))}-cm.json`;

export async function buscarJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 404) throw new Error("Ainda não publicado pelo TSE (404).");
  if (!r.ok) throw new Error(`Erro ${r.status} ao buscar ${url}`);
  return r.json();
}

export async function buscarPrimeiro(urls) {
  let ultimo;
  for (const u of urls) {
    try { return { json: await buscarJson(u), url: u }; } catch (e) { ultimo = e; }
  }
  throw ultimo;
}

// "48,43" -> 48.43 ; "57259504" -> 57259504
export function num(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function lerCandidato(c, par) {
  return {
    id: String(c.sqcand ?? c.seq ?? c.n),
    numero: String(c.n ?? ""),
    nome: c.nmu || c.nm || "",
    partido: par?.sg ?? "",
    votos: num(c.vap),
    pct: num(c.pvap),
    eleito: c.e === "s",
    situacao: c.st ?? "",
    // Só "Válido" pode ser eleito. "Anulado", "Anulado sub judice" e "Válido (legenda)"
    // (voto que vai para o partido) não ocupam vaga.
    elegivel: c.dvt == null || /^válido$/i.test(String(c.dvt).trim()),
    situacaoVoto: c.dvt ?? "",
  };
}

/** Normaliza o arquivo de um cargo para um formato único. */
export function normalizar(json) {
  const cargo = (json.carg ?? [])[0] ?? {};
  const partidos = [];
  const candidatos = [];

  for (const a of cargo.agr ?? []) {
    const pars = a.par ?? [];
    const cands = pars.flatMap((p) => (p.cand ?? []).map((c) => lerCandidato(c, p)));
    // Federação traz os totais em "agr"; partido isolado, dentro de "par".
    const soma = (campo) =>
      a[campo] != null ? num(a[campo]) : pars.reduce((s, p) => s + num(p[campo]), 0);
    const votosNominais = soma("tvtn");
    const votosLegenda = soma("tvtl");
    partidos.push({
      id: String(a.n),
      nome: a.tp === "f" ? a.nm : pars[0]?.sg || a.nm,
      nomeCompleto: a.nm,
      // Federação: composição (ex.: "PT/PC do B/PV"); partido isolado: a sigla.
      sigla: a.tp === "f" ? a.com || a.nm : pars[0]?.sg || a.nm,
      federacao: a.tp === "f",
      votosNominais,
      votosLegenda,
      votos: votosNominais + votosLegenda,
      vagasTse: a.vag != null ? num(a.vag) : null,
      candidatos: cands,
    });
    candidatos.push(...cands);
  }
  candidatos.sort((x, y) => y.votos - x.votos || Number(x.numero) - Number(y.numero));

  const s = json.s ?? {}, v = json.v ?? {};
  // Em todo o site o % do candidato é votos no candidato ÷ votos válidos.
  const validos = num(v.vv);
  if (validos > 0) for (const c of candidatos) c.pct = (c.votos / validos) * 100;
  return {
    cargoNome: cargo.nmn ?? "",
    vagas: num(cargo.nv),
    qeTse: cargo.qe != null ? num(cargo.qe) : null,
    pctSecoes: num(s.pst),
    secoesApuradas: num(s.st),
    secoesTotal: num(s.ts),
    votosValidos: num(v.vv),
    brancos: num(v.vb),
    nulos: num(v.tvn ?? v.vn),
    atualizadoEm: [json.dt, json.ht].filter(Boolean).join(" "),
    comparecimento: num(json.e?.c), pctComparecimento: num(json.e?.pc),
    abstencao: num(json.e?.a), pctAbstencao: num(json.e?.pa),
    // Estado da apuração (EA20): n não iniciada, p em andamento, f finalizada.
    andamento: json.and ?? "n",
    totalizacaoFinal: json.tf === "s",
    // Quando "n", o TSE manda os votos zerados de propósito (regra de divulgação).
    divulgaVotos: json.dv !== "n",
    // Matematicamente definido (Presidente, Governador): "e" eleito, "s" segundo turno.
    definido: json.md === "e" || json.md === "s" ? json.md : "",
    semEleito: json.esae === "s",
    motivosSemEleito: (Array.isArray(json.mnae) ? json.mnae : [])
      .map((m) => (typeof m === "object" ? Object.values(m).join(" ") : String(m))),
    candidatos,
    partidos,
  };
}

export function lerMunicipios(json) {
  const out = {};
  for (const a of json.abr ?? []) {
    out[String(a.cd).toUpperCase()] = (a.mu ?? [])
      .map((m) => ({ cod: String(m.cd), nome: m.nm }))
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  }
  return out;
}

/** Arquivo de acompanhamento -> { sp: { pct, ts, st, andamento, dt, ht }, br: {...} } */
export function lerAcompanhamento(json) {
  const ufs = {};
  for (const a of json.abr ?? []) {
    ufs[String(a.cdabr).toLowerCase()] = {
      pct: num(a.s?.pst), ts: num(a.s?.ts), st: num(a.s?.st), andamento: a.and ?? "n", dt: a.dt ?? "", ht: a.ht ?? "",
      eleitores: num(a.e?.te), comparecimento: num(a.e?.c), abstencao: num(a.e?.a),
    };
  }
  return { ufs, geradoEm: [json.dg, json.hg].filter(Boolean).join(" ") };
}
