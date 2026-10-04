// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos segundos e só
// então vai ao TSE. Assim o TSE recebe poucas consultas, não importa quantas pessoas
// estejam no site. Também registra o histórico da apuração (rotina agendada).

import { fichaDoCandidato } from "./candidato.js";
import { carregarSeed } from "./carga.js";
import { URL_SENADO, senadoresEleitosEm2022 } from "./senado.js";
import { ALVOS, acrescentarEventos, caminhoAlvo, detectarEventos, escolherAlvos, estimarInstante, normalizar, num } from "./eventos.js";
import { acrescentarResultado, lerResultado, UFS_MINUSCULAS } from "./resultados.js";
import { acrescentar, pontoDeAcompanhamento, presencaDeAcompanhamento } from "./historico.js";

const ORIGEM_TSE = "https://resultados.tse.jus.br/oficial/";
const ANO = "2026";
const ELEICAO_FEDERAL = "6257"; // Presidente
const ELEICAO_ESTADUAL = "6259"; // Governador, Senador, Deputados

// O TSE bloqueia por 10 minutos IPs com mais de 100 requisições por segundo ou com
// muitos erros 404. Só passam endereços no padrão exato dos arquivos que existem:
// configuração de municípios, resultado (-u), andamento (-ab) e fotos de candidatos.
export const CAMINHO_VALIDO = new RegExp(
  "^ele(2022|2024|2026)/\\d{3,6}/(" +
    "config/mun-e\\d{6}-cm\\.json" +
    "|dados/(br/br|[a-z]{2}/[a-z]{2}(\\d{5})?)-c\\d{4}-e\\d{6}-u\\.json" +
    "|dados/br/br-e\\d{6}-ab\\.json" +
    "|fotos/(br|[a-z]{2})/\\d{9,14}\\.jpeg" +
    ")$"
);

const INICIO_APURACAO = Date.parse("2026-10-04T17:00:00-03:00") / 1000; // histórico anterior a 17h (Brasília) é descartado
const CACHE_JSON = 10; // segundos
const CACHE_MUNICIPIO = 60; // um arquivo por município: cache maior, para não sobrecarregar o TSE
const CODIGO_IBGE = { RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53 };
const CACHE_FOTO = 86400;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/_seed/")) return new Response("Não encontrado", { status: 404 });
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET") return new Response("Método não permitido", { status: 405 });

    if (url.pathname === "/api/meu-estado") { // estado de quem acessa, para abrir a visão por estado já no lugar certo
      const uf = request.cf?.country === "BR" ? String(request.cf.regionCode || "").toUpperCase() : "";
      return new Response(JSON.stringify({ uf: /^[A-Z]{2}$/.test(uf) ? uf : null }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });
    }
    if (url.pathname === "/api/senadores-mandato") return senadoresMandato();
    const mMalha = /^\/api\/malha\/([A-Za-z]{2})$/.exec(url.pathname);
    if (mMalha) return malhaDoEstado(CODIGO_IBGE[mMalha[1].toUpperCase()]);
    if (url.pathname === "/api/historico") return lerHistorico(request, env, ctx, "historico", { pontos: [] });
    if (url.pathname === "/api/resultados-governador") return lerHistorico(request, env, ctx, "governador", { cands: {}, pontos: [] }, url.searchParams.get("local"));
    if (url.pathname === "/api/resultados-presidente") return lerHistorico(request, env, ctx, "presidente", { cands: {}, pontos: [] }, url.searchParams.get("local"));

    if (url.pathname === "/api/eventos") return lerEventos(request, env, ctx);

    const mCand = /^\/api\/candidato\/(\d{1,15})$/.exec(url.pathname);
    if (mCand) return candidato(env, Number(mCand[1]));

    const caminho = url.pathname.slice("/api/".length);
    if (!CAMINHO_VALIDO.test(caminho)) return new Response("Caminho inválido", { status: 400 });

    const foto = caminho.endsWith(".jpeg");
    const ttl = foto ? CACHE_FOTO : /^ele\d{4}\/\d+\/dados\/[a-z]{2}\/[a-z]{2}\d{5}-/.test(caminho) ? CACHE_MUNICIPIO : CACHE_JSON;
    const resposta = await fetch(ORIGEM_TSE + caminho, {
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": ttl, "404": 30, "500-599": 0 },
      },
    });

    return new Response(resposta.body, {
      status: resposta.status,
      headers: {
        "Content-Type": foto ? "image/jpeg" : "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${foto ? CACHE_FOTO : 5}`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  },

  // Rotina agendada (a cada minuto): guarda a foto do andamento de todos os estados.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(registrarHistorico(env).then((e) => registrarGovernadores(env, e)).catch((e) => console.error("governadores:", e.message)));
    ctx.waitUntil(registrarResultados(env).catch((e) => console.error("resultados da presidência:", e.message)));
    ctx.waitUntil(registrarEventos(env).catch((e) => console.error("definições:", e.message)));
    ctx.waitUntil(carregarSeed(env).catch((e) => console.error("carga do banco de candidatos:", e.message)));
  },
};

// Desenho dos municípios de um estado (malha do IBGE). Quase nunca muda: guardamos por 7 dias.
async function malhaDoEstado(codigo) {
  if (!codigo) return new Response("Estado inválido", { status: 400 });
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${codigo}?formato=image/svg%2Bxml&qualidade=minima&intrarregiao=municipio`, { cf: { cacheEverything: true, cacheTtl: 604800 } });
  if (!r.ok) return new Response("Malha indisponível", { status: 502 });
  return new Response(await r.text(), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}

// Os 27 senadores com mandato até 2031. A lista do Senado muda pouco: guardamos por 1 hora.
async function senadoresMandato() {
  const r = await fetch(URL_SENADO, { headers: { Accept: "application/json" }, cf: { cacheEverything: true, cacheTtl: 3600 } });
  if (!r.ok) return new Response(JSON.stringify({ erro: "Lista do Senado indisponível" }), { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } });
  const dados = senadoresEleitosEm2022(await r.json());
  return new Response(JSON.stringify(dados), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

async function candidato(env, sq) {
  if (!env.DB) return new Response("Banco indisponível", { status: 503 });
  const ficha = await fichaDoCandidato(env.DB, sq);
  if (!ficha) return new Response(JSON.stringify({ erro: "Candidato não encontrado" }), { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } });
  return new Response(JSON.stringify(ficha), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

async function buscarAcompanhamento(eleicao) {
  const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${eleicao}/dados/br/br-e00${eleicao}-ab.json`);
  if (!r.ok) return null;
  const ab = await r.json();
  return { pct: pontoDeAcompanhamento(ab), presenca: presencaDeAcompanhamento(ab) };
}

// Votos de cada candidato a Presidente no Brasil, em cada estado e no exterior.
export async function registrarResultados(env) {
  if (!env.HIST) return;
  const local = ["br", ...UFS_MINUSCULAS];
  const resp = await Promise.all(local.map(async (l) => {
    try {
      const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${ELEICAO_FEDERAL}/dados/${l === "br" ? "br" : l}/${l}-c0001-e00${ELEICAO_FEDERAL}-u.json`);
      return r.ok ? [l, lerResultado(await r.json())] : null;
    } catch { return null; }
  }));
  const v = {}, nomes = {};
  for (const x of resp) if (x) { v[x[0]] = x[1].valor; if (x[0] === "br") Object.assign(nomes, x[1].nomes); }
  if (!v.br) return;
  const atual = await env.HIST.get("presidente", "json");
  const { historico, mudou } = acrescentarResultado(atual, v, nomes);
  if (mudou) await env.HIST.put("presidente", JSON.stringify(historico));
}

// Definições (eleito / 2º turno) com a hora em que apareceram. Revezamos os arquivos para não passar do limite de consultas por minuto.
export async function registrarEventos(env) {
  if (!env.HIST) return;
  const estado = (await env.HIST.get("eventos", "json")) ?? { itens: [], visto: {}, fechado: {} };
  const agora = Date.now(), alvos = escolherAlvos(estado);
  const resp = await Promise.all(alvos.map(async (a) => {
    try {
      const r = await fetch(ORIGEM_TSE + caminhoAlvo(a, ANO, ELEICAO_FEDERAL, ELEICAO_ESTADUAL));
      return r.ok ? [a, normalizar(await r.json())] : [a, null];
    } catch { return [a, null]; }
  }));
  let itens = estado.itens;
  for (const [a, d] of resp) {
    const primeira = !estado.visto[a.id];
    if (!d) continue;
    estado.visto[a.id] = Math.floor(agora / 1000);
    const { eventos, fechado } = detectarEventos(a.cargo, a.uf.toUpperCase(), d);
    itens = acrescentarEventos({ itens }, eventos, agora, primeira).itens;
    if (fechado) estado.fechado[a.id] = 1;
  }
  itens = await refinarEventos(env, itens);
  await env.HIST.put("eventos", JSON.stringify({ itens, visto: estado.visto, fechado: estado.fechado }));
}

// Definições achadas na primeira visita (já existiam antes do registro): estima a hora real a partir do histórico da apuração.
async function refinarEventos(env, itens) {
  const pendentes = itens.filter((e) => e.a && !e.r);
  if (!pendentes.length) return itens;
  const historico = await env.HIST.get("historico", "json");
  const pontos = (historico?.pontos ?? []).filter((p) => p.t >= INICIO_APURACAO);
  const grupos = new Map();
  for (const e of pendentes) { const id = e.cargo === "presidente" ? "presidente:br" : `${e.cargo}:${e.uf.toLowerCase()}`; grupos.set(id, [...(grupos.get(id) ?? []), e]); }
  const feitos = new Set();
  for (const [id, evs] of [...grupos].slice(0, 8)) {
    const alvo = ALVOS.find((a) => a.id === id);
    try {
      const r = await fetch(ORIGEM_TSE + caminhoAlvo(alvo, ANO, ELEICAO_FEDERAL, ELEICAO_ESTADUAL));
      if (!r.ok) continue;
      const json = await r.json(), d = normalizar(json);
      const ordenados = d.candidatos.filter((c) => c.votos > 0 && c.elegivel).sort((a, b) => b.votos - a.votos);
      const votos = ordenados.map((c) => c.votos), chave = alvo.cargo === "presidente" ? "f" : "e", uf = alvo.uf;
      const serie = pontos.map((p) => ({ t: p.t, pct: p[chave]?.[uf] })).filter((p) => p.pct != null);
      const base = { vv: num(json.v?.vv), te: d.eleitorado?.apto ?? 0, vagas: d.vagas || 1, pctAgora: d.pctSecoes, serie, votos };
      for (const e of evs) {
        const indice = ordenados.findIndex((c) => c.id === e.c?.[0]?.id);
        const t = estimarInstante({ ...base, tipo: e.tipo, cargo: e.cargo, indice: Math.max(0, indice) });
        if (t != null) { e.t = t; e.est = 1; }
        e.r = 1; feitos.add(e.k);
      }
    } catch { /* tenta de novo no próximo minuto */ }
  }
  return itens;
}

async function lerEventos(request, env, ctx) {
  const cache = caches.default, chave = new Request(new URL(request.url).origin + "/api/eventos");
  const guardado = await cache.match(chave);
  if (guardado) return guardado;
  const bruto = (env.HIST && (await env.HIST.get("eventos", "json"))) || { itens: [] };
  const itens = (bruto.itens ?? []).filter((e) => e.t >= INICIO_APURACAO).sort((a, b) => b.t - a.t);
  const resposta = new Response(JSON.stringify({ itens, acompanhados: ALVOS.length, fechados: Object.keys(bruto.fechado ?? {}).length }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=10", "Access-Control-Allow-Origin": "*" } });
  ctx.waitUntil(cache.put(chave, resposta.clone()));
  return resposta;
}

export async function registrarHistorico(env) {
  if (!env.HIST) return;
  const [f, e] = await Promise.all([buscarAcompanhamento(ELEICAO_FEDERAL), buscarAcompanhamento(ELEICAO_ESTADUAL)]);
  if (!f && !e) return;
  const atual = await env.HIST.get("historico", "json");
  const { historico, mudou } = acrescentar(atual, { f: f?.pct ?? {}, e: e?.pct ?? {}, p: f?.presenca });
  if (mudou) await env.HIST.put("historico", JSON.stringify(historico));
  return e?.pct ?? null; // % de seções por estado (eleição estadual), para saber quais governos mudaram
}

// Votos de cada candidato a Governador, por estado. Só buscamos os estados cujo % apurado mudou desde a última vez.
export async function registrarGovernadores(env, pctEstadual) {
  if (!env.HIST || !pctEstadual) return;
  const doc = (await env.HIST.get("governador", "json")) ?? { cands: {}, pontos: [], pct: {} };
  const pct = doc.pct ?? {};
  const mudaram = UFS_MINUSCULAS.filter((u) => u !== "zz" && pctEstadual[u] != null && pctEstadual[u] !== pct[u]);
  if (!mudaram.length) return;
  const resp = await Promise.all(mudaram.map(async (u) => {
    try {
      const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${ELEICAO_ESTADUAL}/dados/${u}/${u}-c0003-e00${ELEICAO_ESTADUAL}-u.json`);
      return r.ok ? [u, lerResultado(await r.json())] : null;
    } catch { return null; }
  }));
  const ult = doc.pontos[doc.pontos.length - 1], v = { ...(ult?.v ?? {}) }, nomes = {}, novoPct = { ...pct };
  for (const x of resp) if (x) { v[x[0]] = x[1].valor; Object.assign(nomes, x[1].nomes); novoPct[x[0]] = pctEstadual[x[0]]; }
  const { historico, mudou } = acrescentarResultado({ cands: doc.cands, pontos: doc.pontos }, v, nomes);
  await env.HIST.put("governador", JSON.stringify({ ...historico, pct: novoPct }));
  return mudou;
}

async function lerHistorico(request, env, ctx, chaveKV, vazio, locais = null) {
  const cache = caches.default;
  const lista = locais && /^[a-z]{2}(,[a-z]{2}){0,29}$/.test(locais) ? locais.split(",") : null; // só os locais pedidos: a resposta fica pequena
  const chave = new Request(new URL(request.url).origin + new URL(request.url).pathname + (lista ? `?local=${lista.join(",")}` : ""));
  const guardado = await cache.match(chave);
  if (guardado) return guardado;
  const bruto = (env.HIST && (await env.HIST.get(chaveKV, "json"))) || vazio;
  const recorta = (p) => (lista && p.v ? { ...p, v: Object.fromEntries(lista.filter((l) => p.v[l]).map((l) => [l, p.v[l]])) } : p);
  const dados = { ...bruto, pontos: (bruto.pontos ?? []).filter((p) => p.t >= INICIO_APURACAO).map(recorta) };
  const resposta = new Response(JSON.stringify(dados), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=10",
      "Access-Control-Allow-Origin": "*",
    },
  });
  ctx.waitUntil(cache.put(chave, resposta.clone()));
  return resposta;
}
