// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos segundos e só
// então vai ao TSE. Assim o TSE recebe poucas consultas, não importa quantas pessoas
// estejam no site. Também registra o histórico da apuração (rotina agendada).

import { fichaDoCandidato } from "./candidato.js";
import { carregarSeed } from "./carga.js";
import { URL_SENADO, senadoresEleitosEm2022 } from "./senado.js";
import { ALVOS, alvosDoTurno, acrescentarEventos, caminhoAlvo, detectarEventos, escolherAlvos, estimarInstante, normalizar, num } from "./eventos.js";
import { UFS_GOVERNO_SEGUNDO_TURNO } from "../public/segundo-turno.js";
import { acrescentarResultado, lerResultado, UFS_MINUSCULAS } from "./resultados.js";
import { acrescentar, pontoDeAcompanhamento, presencaDeAcompanhamento } from "./historico.js";

const ORIGEM_TSE = "https://resultados.tse.jus.br/oficial/";
const ANO = "2026";
// Códigos da eleição no TSE por turno: um para Presidente (federal) e outro para Governador, Senador e Deputados (estadual).
const INICIO_DIA_SEGUNDO_TURNO = Date.parse("2026-10-25T00:00:00-03:00");
const TURNOS = {
  1: { turno: 1, federal: "6257", estadual: "6259", inicio: Date.parse("2026-10-04T17:00:00-03:00") / 1000, sufixo: "" },
  2: { turno: 2, federal: "6258", estadual: "6260", inicio: Date.parse("2026-10-25T17:00:00-03:00") / 1000, sufixo: "-t2" }, // histórico do 2º turno em chaves próprias
};
/** Turno em curso (a partir de 25/10 é o 2º) ou o pedido em ?turno= (para ver o outro). */
export const contextoDoTurno = (pedido = null, agora = Date.now()) => TURNOS[pedido === "1" ? 1 : pedido === "2" ? 2 : agora >= INICIO_DIA_SEGUNDO_TURNO ? 2 : 1];

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

const CACHE_JSON = 10; // segundos
const CACHE_MUNICIPIO = 60; // um arquivo por município: cache maior, para não sobrecarregar o TSE
const CODIGO_IBGE = { RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53 };
const CACHE_FOTO = 86400;
const TETO = { presidente: 12, governador: 10, eventos: 6 }; // arquivos do TSE buscados por minuto em cada tarefa

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
    const T = contextoDoTurno(url.searchParams.get("turno"));
    if (url.pathname === "/api/historico") return lerHistorico(request, env, ctx, "historico", { pontos: [] }, null, T);
    if (url.pathname === "/api/resultados-governador") return lerHistorico(request, env, ctx, "governador", { cands: {}, pontos: [] }, url.searchParams.get("local"), T);
    if (url.pathname === "/api/resultados-presidente") return lerHistorico(request, env, ctx, "presidente", { cands: {}, pontos: [] }, url.searchParams.get("local"), T);

    if (url.pathname === "/api/eventos") return lerEventos(request, env, ctx, T);

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
  // O plano gratuito do Cloudflare permite 50 consultas por execução (arquivos do TSE e leituras/gravações no KV),
  // então as tarefas rodam em fila e cada uma tem um teto, somando cerca de 45.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const passo = async (nome, fn) => { try { return await fn(); } catch (e) { console.error(nome + ":", e.message); return null; } };
      const T = contextoDoTurno(); // 1º turno até 24/10; a partir de 25/10, o 2º (chaves e arquivos próprios)
      if (env.HIST && (await env.HIST.get("encerrado" + T.sufixo))) return; // apuração finalizada neste turno: não busca mais nada no TSE
      const andamento = await passo("histórico", () => registrarHistorico(env, T));
      await passo("resultados da presidência", () => registrarResultados(env, andamento?.f, TETO.presidente, T));
      await passo("governadores", () => registrarGovernadores(env, andamento?.e, TETO.governador, T));
      await passo("definições", () => registrarEventos(env, TETO.eventos, T));
      await passo("carga do banco de candidatos", () => carregarSeed(env));
      if (andamento?.final && env.HIST) await passo("encerramento", () => env.HIST.put("encerrado" + T.sufixo, new Date().toISOString())); // última rodada feita: as seguintes não consultam o TSE
    })());
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
  const br = (ab.abr ?? []).find((a) => String(a.cdabr).toLowerCase() === "br");
  return { pct: pontoDeAcompanhamento(ab), presenca: presencaDeAcompanhamento(ab), final: br?.and === "f" }; // "f" = apuração finalizada, segundo o TSE
}

// Votos de cada candidato a Presidente no Brasil, em cada estado e no exterior. Só buscamos o que mudou desde a última vez
// (pelo % de seções), os que mais mudaram primeiro, até o teto da tarefa; o resto mantém o último valor.
export async function registrarResultados(env, pctFederal, max = 12, T = TURNOS[1]) {
  if (!env.HIST || !pctFederal) return;
  const doc = (await env.HIST.get("presidente" + T.sufixo, "json")) ?? { cands: {}, pontos: [], pct: {} };
  const pct = doc.pct ?? {};
  const mudaram = escolherMudancas(["br", ...UFS_MINUSCULAS], pctFederal, pct, max, "br");
  if (!mudaram.length) return;
  const resp = await Promise.all(mudaram.map(async (l) => {
    try {
      const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${T.federal}/dados/${l}/${l}-c0001-e00${T.federal}-u.json`);
      return r.ok ? [l, lerResultado(await r.json())] : null;
    } catch { return null; }
  }));
  const ult = doc.pontos[doc.pontos.length - 1], v = { ...(ult?.v ?? {}) }, nomes = {}, novoPct = { ...pct };
  for (const x of resp) if (x) { v[x[0]] = x[1].valor; Object.assign(nomes, x[1].nomes); novoPct[x[0]] = pctFederal[x[0]]; }
  if (!v.br) return;
  const { historico, mudou } = acrescentarResultado({ cands: doc.cands, pontos: doc.pontos }, v, nomes);
  await env.HIST.put("presidente" + T.sufixo, JSON.stringify({ ...historico, pct: novoPct }));
  return mudou;
}

/** Locais cujo % apurado mudou, os que mais mudaram primeiro (o `primeiro` sempre vai na frente), no máximo `max`. */
export function escolherMudancas(locais, atual, guardado, max, primeiro = "") {
  const mud = locais.filter((l) => atual[l] != null && atual[l] !== guardado[l]);
  mud.sort((a, b) => (a === primeiro ? -1 : b === primeiro ? 1 : Math.abs(atual[b] - (guardado[b] ?? 0)) - Math.abs(atual[a] - (guardado[a] ?? 0))));
  return mud.slice(0, max);
}

// Definições (eleito / 2º turno) com a hora em que apareceram. Revezamos os arquivos para não passar do limite de consultas por minuto.
export async function registrarEventos(env, max = 6, T = TURNOS[1]) {
  if (!env.HIST) return;
  const estado = (await env.HIST.get("eventos" + T.sufixo, "json")) ?? { itens: [], visto: {}, fechado: {} };
  const agora = Date.now(), alvos = escolherAlvos(estado, max, alvosDoTurno(T.turno));
  const resp = await Promise.all(alvos.map(async (a) => {
    try {
      const r = await fetch(ORIGEM_TSE + caminhoAlvo(a, ANO, T.federal, T.estadual));
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
  itens = await refinarEventos(env, itens, T);
  await env.HIST.put("eventos" + T.sufixo, JSON.stringify({ itens, visto: estado.visto, fechado: estado.fechado }));
}

// Definições achadas na primeira visita (já existiam antes do registro): estima a hora real a partir do histórico da apuração.
async function refinarEventos(env, itens, T = TURNOS[1]) {
  const pendentes = itens.filter((e) => e.a && !e.r);
  if (!pendentes.length) return itens;
  const historico = await env.HIST.get("historico" + T.sufixo, "json");
  const pontos = (historico?.pontos ?? []).filter((p) => p.t >= T.inicio);
  const grupos = new Map();
  for (const e of pendentes) { const id = e.cargo === "presidente" ? "presidente:br" : `${e.cargo}:${e.uf.toLowerCase()}`; grupos.set(id, [...(grupos.get(id) ?? []), e]); }
  const feitos = new Set();
  for (const [id, evs] of [...grupos].slice(0, 2)) {
    const alvo = ALVOS.find((a) => a.id === id);
    try {
      const r = await fetch(ORIGEM_TSE + caminhoAlvo(alvo, ANO, T.federal, T.estadual));
      if (!r.ok) continue;
      const json = await r.json(), d = normalizar(json);
      const ordenados = d.candidatos.filter((c) => c.votos > 0 && c.elegivel).sort((a, b) => b.votos - a.votos);
      const votos = ordenados.map((c) => c.votos), chave = alvo.cargo === "presidente" ? "f" : "e", uf = alvo.uf;
      const serie = pontos.map((p) => ({ t: p.t, pct: p[chave]?.[uf] })).filter((p) => p.pct != null);
      const base = { vv: num(json.v?.vvc) || num(json.v?.vv), te: d.eleitorado?.apto ?? 0, vagas: d.vagas || 1, pctAgora: d.pctSecoes, serie, votos };
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

async function lerEventos(request, env, ctx, T = TURNOS[1]) {
  const cache = caches.default, chave = new Request(new URL(request.url).origin + "/api/eventos" + T.sufixo);
  const guardado = await cache.match(chave);
  if (guardado) return guardado;
  const bruto = (env.HIST && (await env.HIST.get("eventos" + T.sufixo, "json"))) || { itens: [] };
  const itens = (bruto.itens ?? []).filter((e) => e.t >= T.inicio).sort((a, b) => b.t - a.t);
  const resposta = new Response(JSON.stringify({ itens, acompanhados: alvosDoTurno(T.turno).length, fechados: Object.keys(bruto.fechado ?? {}).length }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=10", "Access-Control-Allow-Origin": "*" } });
  ctx.waitUntil(cache.put(chave, resposta.clone()));
  return resposta;
}

export async function registrarHistorico(env, T = TURNOS[1]) {
  if (!env.HIST) return;
  const [f, e] = await Promise.all([buscarAcompanhamento(T.federal), buscarAcompanhamento(T.estadual)]);
  if (!f && !e) return;
  const atual = await env.HIST.get("historico" + T.sufixo, "json");
  const { historico, mudou } = acrescentar(atual, { f: f?.pct ?? {}, e: e?.pct ?? {}, p: f?.presenca });
  if (mudou) await env.HIST.put("historico" + T.sufixo, JSON.stringify(historico));
  return { f: f?.pct ?? null, e: e?.pct ?? null, final: !!f?.final && !!e?.final }; // % de seções por estado, para saber quais resultados mudaram
}

// Votos de cada candidato a Governador, por estado. Só buscamos os estados cujo % apurado mudou desde a última vez.
export async function registrarGovernadores(env, pctEstadual, max = 10, T = TURNOS[1]) {
  if (!env.HIST || !pctEstadual) return;
  const doc = (await env.HIST.get("governador" + T.sufixo, "json")) ?? { cands: {}, pontos: [], pct: {} };
  const pct = doc.pct ?? {};
  const mudaram = escolherMudancas(UFS_MINUSCULAS.filter((u) => u !== "zz" && (T.turno === 1 || UFS_GOVERNO_SEGUNDO_TURNO.includes(u.toUpperCase()))), pctEstadual, pct, max);
  if (!mudaram.length) return;
  const resp = await Promise.all(mudaram.map(async (u) => {
    try {
      const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${T.estadual}/dados/${u}/${u}-c0003-e00${T.estadual}-u.json`);
      return r.ok ? [u, lerResultado(await r.json())] : null;
    } catch { return null; }
  }));
  const ult = doc.pontos[doc.pontos.length - 1], v = { ...(ult?.v ?? {}) }, nomes = {}, novoPct = { ...pct };
  for (const x of resp) if (x) { v[x[0]] = x[1].valor; Object.assign(nomes, x[1].nomes); novoPct[x[0]] = pctEstadual[x[0]]; }
  const { historico, mudou } = acrescentarResultado({ cands: doc.cands, pontos: doc.pontos }, v, nomes);
  await env.HIST.put("governador" + T.sufixo, JSON.stringify({ ...historico, pct: novoPct }));
  return mudou;
}

async function lerHistorico(request, env, ctx, chaveKV, vazio, locais = null, T = TURNOS[1]) {
  const cache = caches.default;
  const lista = locais && /^[a-z]{2}(,[a-z]{2}){0,29}$/.test(locais) ? locais.split(",") : null; // só os locais pedidos: a resposta fica pequena
  const chave = new Request(new URL(request.url).origin + new URL(request.url).pathname + `?t=${T.turno}` + (lista ? `&local=${lista.join(",")}` : "")); // a chave do cache inclui o turno
  const guardado = await cache.match(chave);
  if (guardado) return guardado;
  const bruto = (env.HIST && (await env.HIST.get(chaveKV + T.sufixo, "json"))) || vazio;
  const recorta = (p) => (lista && p.v ? { ...p, v: Object.fromEntries(lista.filter((l) => p.v[l]).map((l) => [l, p.v[l]])) } : p);
  const dados = { ...bruto, pontos: (bruto.pontos ?? []).filter((p) => p.t >= T.inicio).map(recorta) };
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
