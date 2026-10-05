import { test } from "node:test";
import assert from "node:assert/strict";
import { passaBusca, partidosDe, barraBusca, filtrando, buscaVazia } from "../public/buscaCandidatos.js";

const cs = [
  { nome: "BEBETO", numero: "4400", partido: "PP", federacao: "PP / UNIÃO" },
  { nome: "MAX", numero: "1100", partido: "UNIÃO", federacao: "PP / UNIÃO" },
  { nome: "JOSÉ DA SILVA", numero: "1234", partido: "PT" },
  { nome: "MARIA CONCEIÇÃO", numero: "4501", partido: "PL" },
  { nome: "ANA SILVA", numero: "2222", partido: "PL" },
];

test("busca ignora acentos e maiúsculas, aceita várias palavras e número", () => {
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "jose silva" })).map((c) => c.numero), ["1234"]);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "conceicao" })).length, 1);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "22" })).map((c) => c.nome), ["ANA SILVA"]);
  assert.equal(cs.filter((c) => passaBusca(c, {})).length, 5);
});

test("filtro por partido combina com o texto", () => {
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "PL" })).length, 2);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "PP" })).map((c) => c.nome), ["BEBETO"]); // partido de uma federação
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "fed:PP / UNIÃO" })).map((c) => c.nome), ["BEBETO", "MAX"]); // a federação inteira
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "PL", texto: "silva" })).map((c) => c.numero), ["2222"]);
  assert.deepEqual(partidosDe(cs).map((p) => p.sigla), ["PL", "PP", "PT", "UNIÃO"]);
});

test("barra: mostra contagem e botão de limpar só quando há filtro", () => {
  assert.ok(!barraBusca(cs, buscaVazia(), 5).includes("data-busca-limpar"));
  assert.ok(barraBusca(cs, buscaVazia(), 5).includes('value="fed:PP / UNIÃO"'));
  const h = barraBusca(cs, { texto: "silva", partido: "PL" }, 1);
  assert.ok(h.includes("data-busca-limpar") && h.includes("1 de 5") && h.includes('value="PL" selected') && filtrando({ texto: " x " }));
});
