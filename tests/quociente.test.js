import test from "node:test";
import assert from "node:assert/strict";
import {
  quocienteEleitoral,
  distribuirCadeiras,
  vagasEstaduais,
  REGRAS_CODIGO_LITERAL,
} from "../public/quociente.js";

const cands = (...v) => v.map((votos, i) => ({ id: String(i), nome: "c" + i, votos }));

test("arredondamento do quociente eleitoral", () => {
  assert.equal(quocienteEleitoral(1005, 10), 100); // 100,5 -> desprezado
  assert.equal(quocienteEleitoral(1006, 10), 101); // 100,6 -> sobe
});

test("vagas da assembleia estadual", () => {
  assert.equal(vagasEstaduais(8), 24);
  assert.equal(vagasEstaduais(12), 36);
  assert.equal(vagasEstaduais(70), 94);
});

test("quociente partidário e sobra por maior média", () => {
  const r = distribuirCadeiras(10, [
    { id: "A", nome: "A", candidatos: cands(200, 150, 100, 50, 20) }, // 520
    { id: "B", nome: "B", candidatos: cands(150, 100, 50) },          // 300
    { id: "C", nome: "C", candidatos: cands(100, 80) },               // 180
  ]);
  assert.equal(r.qe, 100);
  const por = Object.fromEntries(r.partidos.map((p) => [p.id, p.eleitos.length]));
  // QP: A=5, B=3, C=1; sobra: A 520/6=86,7  B 300/4=75  C 180/2=90 -> C
  assert.deepEqual(por, { A: 5, B: 3, C: 2 });
  assert.equal(r.eleitos.length, 10);
  assert.equal(r.sobras.length, 1);
});

test("candidato abaixo de 10% do QE não ocupa vaga do quociente", () => {
  const r = distribuirCadeiras(10, [
    { id: "A", nome: "A", candidatos: cands(210, 5) },        // QP=2, só 1 apto
    { id: "B", nome: "B", candidatos: cands(400, 200, 100, 50, 30, 20, 10, 10, 10, 10, 10, 10) },
  ]);
  const a = r.partidos.find((p) => p.id === "A");
  assert.equal(a.qp, 2);
  assert.equal(a.eleitos.filter((c) => c.via === "quociente").length, 1);
});

test("regra literal do Código exclui partido abaixo de 80% do QE das sobras", () => {
  const partidos = [
    { id: "A", nome: "A", candidatos: cands(500, 300, 100) },  // 900
    { id: "B", nome: "B", candidatos: cands(60) },             // 60 (< 80% do QE)
  ];
  const r = distribuirCadeiras(10, partidos, REGRAS_CODIGO_LITERAL);
  assert.equal(r.partidos.find((p) => p.id === "B").eleitos.length, 0);
});
