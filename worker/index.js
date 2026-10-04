// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos segundos e só
// então vai ao TSE. Assim o TSE recebe poucas consultas, não importa quantas pessoas
// estejam no site. Também registra o histórico da apuração (rotina agendada).

import { fichaDoCandidato } from "./candidato.js";
import { carregarSeed } from "./carga.js";
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
    if (url.pathname === "/api/historico") return lerHistorico(request, env, ctx, "historico", { pontos: [] });
    if (url.pathname === "/api/resultados-presidente") return lerHistorico(request, env, ctx, "presidente", { cands: {}, pontos: [] }, url.searchParams.get("local"));

    const mCand = /^\/api\/candidato\/(\d{1,15})$/.exec(url.pathname);
    if (mCand) return candidato(env, Number(mCand[1]));

    const caminho = url.pathname.slice("/api/".length);
    if (!CAMINHO_VALIDO.test(caminho)) return new Response("Caminho inválido", { status: 400 });

    const foto = caminho.endsWith(".jpeg");
    const ttl = foto ? CACHE_FOTO : CACHE_JSON;
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
    ctx.waitUntil(registrarHistorico(env));
    ctx.waitUntil(registrarResultados(env).catch((e) => console.error("resultados da presidência:", e.message)));
    ctx.waitUntil(carregarSeed(env).catch((e) => console.error("carga do banco de candidatos:", e.message)));
  },
};

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

export async function registrarHistorico(env) {
  if (!env.HIST) return;
  const [f, e] = await Promise.all([buscarAcompanhamento(ELEICAO_FEDERAL), buscarAcompanhamento(ELEICAO_ESTADUAL)]);
  if (!f && !e) return;
  const atual = await env.HIST.get("historico", "json");
  const { historico, mudou } = acrescentar(atual, { f: f?.pct ?? {}, e: e?.pct ?? {}, p: f?.presenca });
  if (mudou) await env.HIST.put("historico", JSON.stringify(historico));
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
