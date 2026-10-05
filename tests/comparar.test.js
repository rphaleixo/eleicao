import { test } from "node:test";
import assert from "node:assert/strict";
import { linhaComparacao, ordenarComparacao, blocoComparar } from "../public/comparar.js";

// Estado com 1000 aptos apurados: A 400, B 300, C 100 (demais), brancos 30, nulos 20, abstenção 150.
const dDe = (a, b, c, apurado = 90) => ({ pctSecoes: apurado, brancos: 30, nulos: 20, abstencao: 150, eleitorado: { apuradas: a + b + c + 200, abstencao: 150 },
  candidatos: [{ id: "1", nome: "ANA", partido: "PT", votos: a }, { id: "2", nome: "BIA", partido: "PL", votos: b }, { id: "3", nome: "CAIO", partido: "PSD", votos: c }] });

test("linha: os quatro pedaços somam 100% dos aptos apurados e a diferença vem em p.p. e votos", () => {
  const l = linhaComparacao("SP", dDe(400, 300, 100), "1", "2");
  assert.equal(l.base, 1000); assert.equal(l.pctA, 40); assert.equal(l.pctB, 30); assert.equal(l.difPP, 10); assert.equal(l.difVotos, 100);
  assert.equal(l.outros, 100); assert.equal(l.naoVoto, 200); assert.equal(l.pctA + l.pctB + l.pctOutros + l.pctNaoVoto, 100);
  assert.equal(linhaComparacao("SP", null, "1", "2"), null);
});

test("ordenar pela diferença entre os dois candidatos", () => {
  const ls = [["AC", dDe(200, 400, 100)], ["BA", dDe(500, 100, 100)], ["CE", dDe(310, 300, 100)]].map(([u, d]) => linhaComparacao(u, d, "1", "2"));
  assert.deepEqual(ordenarComparacao(ls, "vantagemA").map((l) => l.uf), ["BA", "CE", "AC"]);
  assert.deepEqual(ordenarComparacao(ls, "vantagemB").map((l) => l.uf), ["AC", "CE", "BA"]);
  assert.deepEqual(ordenarComparacao(ls, "margem").map((l) => l.uf), ["CE", "AC", "BA"]); // CE: 1 p.p.; AC: 20; BA: 40
  assert.deepEqual(ordenarComparacao(ls, "maiorMargem").map((l) => l.uf), ["BA", "AC", "CE"]);
  assert.deepEqual(ordenarComparacao(ls, "az").map((l) => l.uf), ["AC", "BA", "CE"]);
});

test("bloco: dois candidatos em destaque, demais e não voto, linha do total e escolha do par", () => {
  const candidatos = dDe(1, 1, 1).candidatos;
  const h = blocoComparar({ candidatos, local: { rotulo: "Brasil", uf: "BR", d: dDe(900, 700, 200) }, itens: [{ uf: "SP", d: dDe(400, 300, 100) }, { uf: "MG", d: dDe(100, 300, 100) }], cmp: { a: "1", b: "2", ordem: "vantagemA" } });
  assert.ok(h.includes("Comparar candidatos") && h.includes("Demais candidatos") && h.includes("Não voto") && h.includes("+10,00 p.p.") && h.includes("−28,57 p.p."));
  assert.ok(h.indexOf("Brasil") < h.indexOf("São Paulo") && h.indexOf("São Paulo") < h.indexOf("Minas Gerais")); // total primeiro; depois por vantagem de A
  assert.ok(h.includes('value="2" selected') && h.includes('value="2" disabled')); // o par não repete candidato
  const igual = blocoComparar({ candidatos, local: { rotulo: "Brasil", uf: "BR", d: dDe(1, 1, 1) }, itens: [], cmp: { a: "1", b: "1", ordem: "az" } });
  assert.ok(igual.includes('value="1" selected')); // B repetido cai em outro candidato
});
