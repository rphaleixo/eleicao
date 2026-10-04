// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos
// segundos e só então vai ao TSE. Assim o TSE recebe poucas consultas,
// não importa quantas pessoas estejam no site.

const ORIGEM_TSE = "https://resultados.tse.jus.br/oficial/";
const CACHE_SEGUNDOS = 45;

// Só aceita caminhos de arquivos JSON de apuração (não é um proxy aberto).
const CAMINHO_VALIDO =
  /^ele(2022|2026)\/\d{3,6}\/(config|dados|dados-simplificados)\/[a-z0-9_\-/]+\.json$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    if (request.method !== "GET") {
      return new Response("Método não permitido", { status: 405 });
    }

    const caminho = url.pathname.slice("/api/".length);
    if (!CAMINHO_VALIDO.test(caminho)) {
      return new Response("Caminho inválido", { status: 400 });
    }

    const resposta = await fetch(ORIGEM_TSE + caminho, {
      headers: { Accept: "application/json" },
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": CACHE_SEGUNDOS,
          "404": 15,
          "500-599": 0,
        },
      },
    });

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_SEGUNDOS - 15}`,
      "Access-Control-Allow-Origin": "*",
    });
    return new Response(resposta.body, { status: resposta.status, headers });
  },
};
