import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker/index.js";

test("subdomínio ese.*: a raiz serve a página de cenários; os demais endereços seguem o site", async () => {
  const pedidos = [];
  const env = { ASSETS: { fetch: async (req) => { pedidos.push(new URL(req.url).pathname); return new Response("ok"); } } };
  await worker.fetch(new Request("https://ese.censomusicalrj.workers.dev/"), env, {});
  await worker.fetch(new Request("https://eleicao.censomusicalrj.workers.dev/"), env, {});
  await worker.fetch(new Request("https://ese.censomusicalrj.workers.dev/style.css"), env, {});
  assert.deepEqual(pedidos, ["/ese/", "/", "/style.css"]);
});

test("página /ese/ (o endereço dos cenários é /ese neste mesmo site)", () => {
  const html = readFileSync(new URL("../public/ese/index.html", import.meta.url), "utf8");
  assert.ok(html.includes('<base href="/">') && html.includes("E se…") && html.includes('class="ese"') && html.includes('src="app.js"'));
  assert.ok(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").includes('"run_worker_first": ["/", '));
});
