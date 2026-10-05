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
export const urlEventos = () => "/api/eventos";
export const urlResultadosGovernador = (locais = []) => `/api/resultados-governador${locais.length ? `?local=${locais.join(",")}` : ""}`;
export const urlResultadosPresidente = (locais = []) => `/api/resultados-presidente${locais.length ? `?local=${locais.join(",")}` : ""}`;

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
    const fed = a.tp === "f" ? a.com || a.nm : ""; // federação do candidato ("" se o partido concorre sozinho)
    const cands = pars.flatMap((p) => (p.cand ?? []).map((c) => ({ ...lerCandidato(c, p), federacao: fed })));
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
  // Situação visual de cada candidato (c.sit): "eleito" ou "segundo" (2º turno). Vale o que o TSE marcou no candidato;
  // enquanto isso não vem, usa a eleição matematicamente definida (md): "e" = mais votados eleitos, "s" = dois vão ao 2º turno.
  const md = json.md === "e" || json.md === "s" ? json.md : "";
  const temSegundoTurno = String(cargo.cd) !== "5"; // o Senado não tem 2º turno
  for (const c of candidatos) c.sit = /2.\s*turno/i.test(c.situacao) ? (temSegundoTurno ? "segundo" : "") : c.eleito ? "eleito" : ""; // o TSE marca e="s" também em quem vai ao 2º turno
  const vagas = num(cargo.nv) || 1;
  const majoritario = ["1", "3", "5"].includes(String(cargo.cd)); // a definição matemática (md) só existe nas eleições majoritárias
  if (majoritario && !candidatos.some((c) => c.sit)) {
    const lideres = candidatos.filter((c) => c.votos > 0 && c.elegivel);
    if (md === "e") lideres.slice(0, vagas).forEach((c) => { c.sit = "eleito"; });
    if (md === "s" && temSegundoTurno) lideres.slice(0, 2).forEach((c) => { c.sit = "segundo"; });
  }
  // Senado: o TSE não publica a "definição matemática". Calculamos: os mais votados (nas vagas) estão eleitos quando o último deles
  // tem mais votos do que qualquer outro candidato somado a todos os eleitores aptos das seções ainda não totalizadas
  // (limite máximo do que o rival poderia ganhar). É um critério conservador: nunca marca um eleito que ainda possa perder.
  if (String(cargo.cd) === "5" && !candidatos.some((c) => c.sit) && num(json.e?.est) > 0) {
    const restantes = Math.max(0, num(json.e?.te) - num(json.e?.est));
    const lideres = candidatos.filter((c) => c.votos > 0 && c.elegivel).slice(0, vagas);
    const rivais = candidatos.filter((c) => !lideres.includes(c));
    const maiorRival = rivais.reduce((m, c) => Math.max(m, c.votos), 0);
    if (lideres.length === vagas && lideres[vagas - 1].votos > maiorRival + restantes) {
      for (const c of lideres) { c.sit = "eleito"; c.sitCalculada = true; }
    }
  }
  // Em todo o site o % do candidato é votos no candidato ÷ votos válidos. A base é a do TSE (vvc): válidos mais os anulados
  // sub judice, cujos candidatos continuam na lista. Sem isso, os percentuais somam mais de 100% e a maioria de 50% se distorce.
  const validos = num(v.vvc) || num(v.vv);
  const totalApuradas = num(json.e?.est); // eleitores aptos das seções apuradas: base da visão de votos totais
  for (const c of candidatos) c.pctTotal = totalApuradas > 0 ? (c.votos / totalApuradas) * 100 : null;
  if (validos > 0) for (const c of candidatos) c.pct = (c.votos / validos) * 100;
  for (const c of candidatos) c.pctValido = c.pct;
  return {
    cargoNome: cargo.nmn ?? "",
    vagas: num(cargo.nv),
    qeTse: cargo.qe != null ? num(cargo.qe) : null,
    pctSecoes: num(s.pst),
    secoesApuradas: num(s.st),
    secoesTotal: num(s.ts),
    votosValidos: num(v.vvc) || num(v.vv),
    brancos: num(v.vb),
    nulos: num(v.tvn ?? v.vn),
    atualizadoEm: [json.dt, json.ht].filter(Boolean).join(" "),
    votos: {
      total: num(v.tv), nominais: num(v.vvc), validos: num(v.vv), nominaisValidos: num(v.vnom), legenda: num(v.vl),
      anulados: num(v.van), anuladosSubJudice: num(v.vansj), brancos: num(v.vb), nulos: num(v.tvn ?? v.vn),
    },
    eleitorado: { apto: num(json.e?.te), apuradas: num(json.e?.est), comparecimento: num(json.e?.c), abstencao: num(json.e?.a) },
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
      .map((m) => ({ cod: String(m.cd), nome: m.nm, ibge: m.cdi ? String(m.cdi) : "" }))
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
