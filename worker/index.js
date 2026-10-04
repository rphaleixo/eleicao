// Intermediário entre o site e o TSE.
// Os visitantes consultam /api/..., a Cloudflare guarda uma cópia por poucos
// segundos e só então vai ao TSE. Assim o TSE recebe poucas consultas,
// não importa quantas pessoas estejam no site.

const ORIGEM_TSE = "https://resultados.tse.jus.br/oficial/";
// O TSE publica cada arquivo com max-age de ~57s; consultar mais rápido não traz dado novo.
const CACHE_SEGUNDOS = 30;

// Só aceita endereços de arquivos que existem no padrão do TSE. O TSE bloqueia por 10
// minutos IPs com muitos erros 404 e com mais de 100 requisições por segundo.
// Município: sempre 5 dígitos. Resultado: sufixo -u. Configuração: mun-e<código>-cm.
const CAMINHO_VALIDO = new RegExp(
  "^ele(2022|2024|2026)/\\d{3,6}/(" +
    "config/mun-e\\d{6}-cm" +
    "|dados/(br/br|[a-z]{2}/[a-z]{2}(\\d{5})?)-c\\d{4}-e\\d{6}-u" +
    ")\\.json$"
);

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
          "404": 30,
          "500-599": 0,
        },
      },
    });

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${Math.floor(CACHE_SEGUNDOS / 2)}`,
      "Access-Control-Allow-Origin": "*",
    });
    return new Response(resposta.body, { status: resposta.status, headers });
  },
};
