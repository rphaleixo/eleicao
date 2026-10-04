import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Garante que todo nome importado entre os arquivos do site realmente existe
// (um nome renomeado deixa a página inteira em branco e nenhum outro teste percebe).
globalThis.location = { search: "" };

test("imports do site apontam para exports que existem", async () => {
  const dir = new URL("../public/", import.meta.url);
  for (const arq of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const src = fs.readFileSync(new URL(arq, dir), "utf8");
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)"/g)) {
      const mod = await import(new URL(m[2], dir));
      for (const nome of m[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) { // "a as b": vale o nome original
        assert.ok(nome in mod, `${arq}: "${nome}" não é exportado por ${m[2]}`);
      }
    }
  }
});

test("app.js não usa campos de configuração que não existem", async () => {
  const { CONFIG } = await import("../public/config.js");
  const src = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  for (const m of src.matchAll(/CONFIG\.(\w+)/g)) {
    assert.ok(m[1] in CONFIG, `CONFIG.${m[1]} não existe`);
  }
});
