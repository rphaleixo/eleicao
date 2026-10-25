import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const caixa = { innerHTML: "" };
globalThis.document = { getElementById: (id) => (id === "toasts" ? caixa : null) };
const { mostrarToast, resolverToast, dispensarToast, assuntoAtual } = await import("../public/toast.js");

test("toast: role=status, aria-live, título em negrito, ação e × de dispensar; um por vez", () => {
  mostrarToast({ assunto: "demora", estado: "a", titulo: "Está demorando mais que o normal.", apoio: "O TSE pode estar lento.", acao: { rotulo: "Tentar agora", atributo: "data-tentar" } });
  assert.ok(caixa.innerHTML.includes('role="status"') && caixa.innerHTML.includes('aria-live="polite"') && caixa.innerHTML.includes("<b>Está demorando mais que o normal.</b>"));
  assert.ok(caixa.innerHTML.includes("data-tentar") && caixa.innerHTML.includes("data-toast-fechar") && caixa.innerHTML.includes('aria-label="Dispensar aviso"'));
  mostrarToast({ assunto: "falha", estado: "x", titulo: "Não foi possível atualizar." });
  assert.equal((caixa.innerHTML.match(/data-toast=/g) || []).length, 1); // o novo substitui o anterior
  assert.equal(assuntoAtual(), "falha");
});

test("toast dispensado só volta se o estado mudar; resolver o assunto tira o aviso e libera a volta", () => {
  mostrarToast({ assunto: "demora", estado: "ep1", titulo: "t" });
  dispensarToast();
  assert.equal(caixa.innerHTML, "");
  assert.equal(mostrarToast({ assunto: "demora", estado: "ep1", titulo: "t" }), false); // mesmo estado: não repete
  assert.equal(mostrarToast({ assunto: "demora", estado: "ep2", titulo: "t" }), true); // estado novo: volta
  resolverToast("demora");
  assert.equal(caixa.innerHTML, "");
  assert.equal(mostrarToast({ assunto: "demora", estado: "ep2", titulo: "t" }), true); // resolvido e de novo: aparece
  resolverToast("demora");
});

test("toast de sucesso some em 4 segundos; o de lentidão fica", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  mostrarToast({ assunto: "conexao", titulo: "Voltou a conectar.", sucesso: true });
  assert.ok(caixa.innerHTML.includes("el-toast--ok"));
  t.mock.timers.tick(3900); assert.ok(caixa.innerHTML !== "");
  t.mock.timers.tick(200); assert.equal(caixa.innerHTML, "");
  mostrarToast({ assunto: "demora", estado: "z", titulo: "Está demorando" });
  t.mock.timers.tick(60000); assert.ok(caixa.innerHTML !== "");
  resolverToast("demora");
});

test("o contêiner do toast existe na página e é fixo (não ocupa espaço no fluxo); a faixa de lentidão saiu do conteúdo", () => {
  assert.ok(fs.readFileSync("public/index.html", "utf8").includes('<div class="el-toasts" id="toasts"></div>'));
  assert.match(fs.readFileSync("public/ds/bundle.css", "utf8"), /\.el-toasts \{ position: fixed;/);
  assert.ok(!fs.readFileSync("public/app.js", "utf8").includes("aviso-demora"));
});
