import { test } from "node:test";
import assert from "node:assert/strict";
import { passaBusca, partidosDe, barraBusca, filtrando, buscaVazia } from "../public/buscaCandidatos.js";

const cs = [
  { nome: "JOSÉ DA SILVA", numero: "1234", partido: "PT" },
  { nome: "MARIA CONCEIÇÃO", numero: "4501", partido: "PL" },
  { nome: "ANA SILVA", numero: "2222", partido: "PL" },
];

test("busca ignora acentos e maiúsculas, aceita várias palavras e número", () => {
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "jose silva" })).map((c) => c.numero), ["1234"]);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "conceicao" })).length, 1);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { texto: "22" })).map((c) => c.nome), ["ANA SILVA"]);
  assert.equal(cs.filter((c) => passaBusca(c, {})).length, 3);
});

test("filtro por partido combina com o texto", () => {
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "PL" })).length, 2);
  assert.deepEqual(cs.filter((c) => passaBusca(c, { partido: "PL", texto: "silva" })).map((c) => c.numero), ["2222"]);
  assert.deepEqual(partidosDe(cs), [{ sigla: "PL", n: 2 }, { sigla: "PT", n: 1 }]);
});

test("barra: mostra contagem e botão de limpar só quando há filtro", () => {
  assert.ok(!barraBusca(cs, buscaVazia(), 3).includes("data-busca-limpar"));
  const h = barraBusca(cs, { texto: "silva", partido: "PL" }, 1);
  assert.ok(h.includes("data-busca-limpar") && h.includes("1 de 3") && h.includes('value="PL" selected') && filtrando({ texto: " x " }));
});
