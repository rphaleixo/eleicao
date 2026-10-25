globalThis.location = { search: "?turno=1" };
import { test } from "node:test";
import assert from "node:assert/strict";
const { buscarJson } = await import("../public/tse.js");

const resposta = (status, corpo = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => corpo });

test("se o servidor do site é recusado pelo TSE (403), o navegador pede direto ao TSE", async () => {
  const pedidos = [];
  globalThis.fetch = async (u) => { pedidos.push(u); return u.startsWith("/api/") ? resposta(403) : resposta(200, { ok: true }); };
  const r = await buscarJson("/api/ele2026/6257/dados/br/br-e006257-ab.json");
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(pedidos, ["/api/ele2026/6257/dados/br/br-e006257-ab.json", "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json"]);
  pedidos.length = 0; // nos próximos minutos já vai direto, sem tentar o servidor
  await buscarJson("/api/ele2026/6257/dados/ac/ac-e006257-ab.json");
  assert.deepEqual(pedidos, ["https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ac/ac-e006257-ab.json"]);
});

test("404 continua sendo 'ainda não publicado' e outros endereços não vão ao TSE", async () => {
  globalThis.fetch = async () => resposta(404);
  await assert.rejects(() => buscarJson("/api/ele2026/6258/dados/br/br-c0001-e006258-u.json"), /Ainda não publicado/);
  const pedidos = [];
  globalThis.fetch = async (u) => { pedidos.push(u); return resposta(502); };
  await assert.rejects(() => buscarJson("/api/senadores-mandato"), /Erro 502/);
  assert.deepEqual(pedidos, ["/api/senadores-mandato"]);
});
