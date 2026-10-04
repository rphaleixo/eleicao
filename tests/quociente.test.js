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

test("candidato sub judice conta votos para o partido mas não ocupa vaga", () => {
  // Caso real (Porto Alegre, 2024): o 4º mais votado do MDB estava "anulado sub judice".
  const a = cands(600, 300, 100);
  a.push({ id: "sj", nome: "sub judice", votos: 90, elegivel: false });
  const r = distribuirCadeiras(10, [
    { id: "A", nome: "A", candidatos: a },                  // 1090 votos, 4º é inelegível
    { id: "B", nome: "B", candidatos: cands(400, 300, 200) }, // 900
  ], REGRAS_CODIGO_LITERAL);
  assert.equal(r.votosValidos, 1990);
  assert.ok(!r.eleitos.some((e) => e.id === "sj"));
});

test("art. 111: nenhum partido alcança o quociente, elegem-se os mais votados", () => {
  // 20 partidos com ~60 votos: o quociente (101) não é alcançado por nenhum
  const partidos = Array.from({ length: 20 }, (_, i) => ({
    id: "P" + i, nome: "P" + i, candidatos: cands(60 - i),
  }));
  const r = distribuirCadeiras(10, partidos, REGRAS_CODIGO_LITERAL);
  assert.equal(r.qe, 101);
  assert.equal(r.eleitos.length, 10);
  assert.ok(r.eleitos.every((e) => e.via === "art. 111"));
  assert.deepEqual(r.eleitos.map((e) => e.votos), [60, 59, 58, 57, 56, 55, 54, 53, 52, 51]);
});
