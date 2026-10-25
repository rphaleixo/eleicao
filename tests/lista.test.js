import test from "node:test";
import assert from "node:assert/strict";
const { painelLista, limiteDe, maisItens, verMais, zerarLimites } = await import("../public/lista.js");

test("lista longa: começa com 10, o botão acrescenta 10 e some quando já se vê tudo", () => {
  zerarLimites();
  assert.equal(limiteDe("x"), 10);
  const v = verMais("x", 10, 27);
  assert.ok(v.includes("Ver mais 10") && v.includes('data-vermais="x"') && v.includes("27"));
  maisItens("x"); assert.equal(limiteDe("x"), 20);
  maisItens("x"); assert.equal(limiteDe("x"), 30);
  assert.equal(verMais("x", 27, 27), "");
  assert.ok(verMais("x", 20, 27).includes("Ver mais 7"));
  assert.equal(limiteDe("cmp", 5), 5); maisItens("cmp", 10, 5); assert.equal(limiteDe("cmp", 5), 15);
});

test("painel recolhido por padrão, com o título e o resumo à vista", () => {
  const h = painelLista("p1", "Resultado por estado", "27 estados · ordem alfabética", "<p>corpo</p>");
  assert.ok(h.includes("<details") && !h.includes(" open") && h.includes("Resultado por estado") && h.includes("27 estados") && h.includes("<p>corpo</p>"));
});
