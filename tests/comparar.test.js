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

import { parDoEstado, blocoCompararGoverno } from "../public/comparar.js";
const cand = (id, nome, partido, votos) => ({ id, nome, partido, votos, elegivel: true });
const gov = (cs, apurado = 100) => ({ pctSecoes: apurado, brancos: 30, nulos: 20, abstencao: 150, eleitorado: { apuradas: cs.reduce((t, c) => t + c.votos, 0) + 200 }, candidatos: cs });

test("governo: par do estado pelos dois mais votados ou por partido", () => {
  const d = gov([cand("1", "ANA", "PT", 400), cand("2", "BIA", "PL", 300), cand("3", "CAIO", "PSD", 100)]);
  assert.deepEqual(parDoEstado(d, "top2").map((c) => c.id), ["1", "2"]);
  assert.deepEqual(parDoEstado(d, "partidos", "PSD", "PT").map((c) => c.id), ["3", "1"]);
  assert.equal(parDoEstado(d, "partidos", "PT", "NOVO"), null); // um dos partidos não disputa
});

test("governo: bloco com um par por estado, ordenado pela diferença", () => {
  const lista = [{ uf: "SP", d: gov([cand("1", "ANA", "PT", 400), cand("2", "BIA", "PL", 300)]) }, { uf: "RJ", d: gov([cand("3", "DUDA", "PSD", 360), cand("4", "EDU", "PP", 350)]) }, { uf: "AC", d: null }];
  const partidos = [{ sigla: "PL", n: 1 }, { sigla: "PP", n: 1 }, { sigla: "PSD", n: 1 }, { sigla: "PT", n: 1 }];
  const h = blocoCompararGoverno({ lista, cmp: { modo: "top2", ordem: "margem" }, partidos });
  assert.ok(h.indexOf("Rio de Janeiro") < h.indexOf("São Paulo") && h.includes("PSD × PP") && h.includes("PT × PL") && !h.includes("Acre"));
  const hp = blocoCompararGoverno({ lista, cmp: { modo: "partidos", pa: "PT", pb: "PL", ordem: "vantagemA" }, partidos });
  assert.ok(hp.includes("São Paulo") && !hp.includes("Rio de Janeiro") && hp.includes("data-cmpg-pa"));
});
