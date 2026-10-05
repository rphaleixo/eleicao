import { test } from "node:test";
import assert from "node:assert/strict";
import { distribuirCadeiras } from "../public/quociente.js";

const cand = (id, votos) => ({ id, nome: id, votos, elegivel: true });
// 10 vagas, 1000 votos válidos: QE = 100; 10% do QE = 10 votos.
test("barrados: o partido tem cadeiras pelo quociente, mas candidatos abaixo de 10% do QE não podem ocupá-las", () => {
  const r = distribuirCadeiras(10, [
    { id: "A", nome: "A", votos: 600, candidatos: [cand("a1", 300), cand("a2", 250), cand("a3", 20), cand("a4", 15), cand("a5", 8), cand("a6", 7)] }, // QP = 6; só 4 têm >= 10 votos
    { id: "B", nome: "B", votos: 400, candidatos: [cand("b1", 200), cand("b2", 100), cand("b3", 60), cand("b4", 40)] },                              // QP = 4
  ]);
  const a = r.partidos.find((p) => p.id === "A");
  assert.equal(a.qp, 6);
  assert.deepEqual(a.eleitos.filter((e) => e.via === "quociente").map((e) => e.id), ["a1", "a2", "a3", "a4"]);
  assert.deepEqual(r.barrados.map((b) => b.id), ["a5", "a6"]); // ocupariam as 5ª e 6ª vagas, com 8 e 7 votos
  assert.equal(r.barrados[0].minimo, 10); assert.equal(r.barrados[0].faltam, 2); assert.equal(r.barrados[0].qp, 6); assert.equal(a.cadeirasSemCandidato, 2);
});

test("sem barrados quando todos os que ocupariam as vagas passam de 10% do QE", () => {
  const r = distribuirCadeiras(10, [{ id: "A", nome: "A", votos: 600, candidatos: [cand("a1", 300), cand("a2", 200), cand("a3", 100)] }, { id: "B", nome: "B", votos: 400, candidatos: [cand("b1", 400)] }]);
  assert.deepEqual(r.barrados.map((b) => b.id).filter((id) => id.startsWith("b")), []); // B: QP 4, só 1 candidato: vagas sem candidato, mas ninguém barrado
  assert.equal(r.partidos.find((p) => p.id === "B").cadeirasSemCandidato, 3);
});

test("candidato sub judice não conta como barrado (já não concorre à vaga)", () => {
  const r = distribuirCadeiras(10, [{ id: "A", nome: "A", votos: 1000, candidatos: [{ ...cand("a1", 500), elegivel: false }, cand("a2", 400), cand("a3", 5)] }]);
  assert.ok(!r.barrados.some((b) => b.id === "a1"));
});
