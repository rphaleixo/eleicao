import test from "node:test";
import assert from "node:assert/strict";
import { comandos, carregarSeed } from "../worker/carga.js";

test("comandos: uma instrução por linha, ignorando linhas vazias", () => {
  assert.deepEqual(comandos("A;\n\n B; \nC;\n"), ["A;", "B;", "C;"]);
});

test("carregarSeed aplica os arquivos pendentes e marca concluído", async () => {
  const tabela = [];
  const lotes = [];
  const DB = {
    prepare(sql) {
      return {
        sql, args: [],
        bind(...a) { this.args = a; return this; },
        async all() { return { results: tabela.map((arquivo) => ({ arquivo })) }; },
        async run() { if (sql.startsWith("INSERT OR REPLACE INTO carga")) tabela.push(sql.includes("VALUES (?, ?, ?)") ? this.args[0] : this.args[0]); return {}; },
      };
    },
    async batch(l) { lotes.push(l.length); return []; },
  };
  const ASSETS = { async fetch(req) {
    const n = new URL(req.url).pathname.split("/").pop();
    if (n === "indice.json") return new Response('{"arquivos":2}');
    return new Response("INSERT 1;\nINSERT 2;\n");
  } };
  const r = await carregarSeed({ DB, ASSETS });
  assert.equal(r.feito, true);
  assert.deepEqual(lotes, [2, 2]);
  assert.deepEqual(tabela, ["001.sql", "002.sql", "concluido-2"]);
  assert.deepEqual(await carregarSeed({ DB, ASSETS }), { feito: true });
  assert.equal(lotes.length, 2);
});
