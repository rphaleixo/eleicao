import test from "node:test";
import assert from "node:assert/strict";
const { TEMAS, lerTema, aplicarTema, escolherTema, controleTema } = await import("../public/tema.js");
const raiz = () => { const a = new Map(); return { setAttribute: (k, v) => a.set(k, v), removeAttribute: (k) => a.delete(k), getAttribute: (k) => a.get(k) ?? null }; };

test("tema: Auto tira o atributo, Claro e Escuro vão em data-theme no elemento raiz", () => {
  const r = raiz();
  assert.equal(aplicarTema("escuro", r), "escuro"); assert.equal(r.getAttribute("data-theme"), "escuro");
  assert.equal(aplicarTema("claro", r), "claro"); assert.equal(r.getAttribute("data-theme"), "claro");
  assert.equal(aplicarTema("auto", r), "auto"); assert.equal(r.getAttribute("data-theme"), null);
  assert.equal(aplicarTema("qualquer coisa", r), "auto");
});

test("tema: sem armazenamento (ou com erro) vale Auto e nada quebra; com armazenamento guarda a escolha", () => {
  globalThis.localStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  assert.equal(lerTema(), "auto");
  assert.equal(escolherTema("escuro", raiz()), "escuro"); // não lança
  const guardado = {};
  globalThis.localStorage = { getItem: (k) => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = v; } };
  escolherTema("claro", raiz());
  assert.equal(lerTema(), "claro");
  guardado.tema = "invalido"; assert.equal(lerTema(), "auto");
  delete globalThis.localStorage;
});

test("tema: o controle escreve as três opções e marca a ativa", () => {
  const h = controleTema("claro");
  for (const [, nome] of TEMAS) assert.ok(h.includes(nome));
  assert.ok(h.includes('data-tema="claro" aria-pressed="true"') && h.includes('data-tema="auto" aria-pressed="false"'));
});
