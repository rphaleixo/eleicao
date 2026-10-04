// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos segundos e só
// então vai ao TSE. Assim o TSE recebe poucas consultas, não importa quantas pessoas
// estejam no site. Também registra o histórico da apuração (rotina agendada).

import { acrescentar, pontoDeAcompanhamento } from "./historico.js";

const ORIGEM_TSE = "https://resultados.tse.jus.br/oficial/";
const ANO = "2026";
const ELEICAO_FEDERAL = "6257"; // Presidente
const ELEICAO_ESTADUAL = "6259"; // Governador, Senador, Deputados

// O TSE bloqueia por 10 minutos IPs com mais de 100 requisições por segundo ou com
// muitos erros 404. Só passam endereços no padrão exato dos arquivos que existem:
// configuração de municípios, resultado (-u), andamento (-ab) e fotos de candidatos.
const CAMINHO_VALIDO = new RegExp(
  "^ele(2022|2024|2026)/\\d{3,6}/(" +
    "config/mun-e\\d{6}-cm\\.json" +
    "|dados/(br/br|[a-z]{2}/[a-z]{2}(\\d{5})?)-c\\d{4}-e\\d{6}-u\\.json" +
    "|dados/br/br-e\\d{6}-ab\\.json" +
    "|fotos/(br|[a-z]{2})/\\d{12}\\.jpeg" +
    ")$"
);

const CACHE_JSON = 10; // segundos
const CACHE_FOTO = 86400;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET") return new Response("Método não permitido", { status: 405 });

    if (url.pathname === "/api/historico") return historico(request, env, ctx);

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
  },
};

async function buscarAcompanhamento(eleicao) {
  const r = await fetch(`${ORIGEM_TSE}ele${ANO}/${eleicao}/dados/br/br-e00${eleicao}-ab.json`);
  if (!r.ok) return null;
  return pontoDeAcompanhamento(await r.json());
}

export async function registrarHistorico(env) {
  if (!env.HIST) return;
  const [f, e] = await Promise.all([buscarAcompanhamento(ELEICAO_FEDERAL), buscarAcompanhamento(ELEICAO_ESTADUAL)]);
  if (!f && !e) return;
  const atual = await env.HIST.get("historico", "json");
  const { historico, mudou } = acrescentar(atual, { f: f ?? {}, e: e ?? {} });
  if (mudou) await env.HIST.put("historico", JSON.stringify(historico));
}

async function historico(request, env, ctx) {
  const cache = caches.default;
  const chave = new Request(new URL("/api/historico", request.url).toString());
  const guardado = await cache.match(chave);
  if (guardado) return guardado;
  const dados = (env.HIST && (await env.HIST.get("historico", "json"))) || { pontos: [] };
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
