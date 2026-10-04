import test from "node:test";
import assert from "node:assert/strict";
import { distribuirEstado, consolidarNacional } from "../public/proporcional.js";
import { corPartido } from "../public/cores.js";

const cand = (id, votos) => ({ id, nome: id, votos, elegivel: true });
const d = (vagas, partidos, extra = {}) => ({ vagas, totalizacaoFinal: false, partidos, ...extra });
const p = (id, sigla, votos, cands) => ({ id, sigla, nome: sigla, nomeCompleto: sigla, federacao: false, votos, vagasTse: 0, candidatos: cands });

test("cadeiras por partido em um estado", () => {
  const est = d(10, [
    p("A", "A", 520, [cand("a1", 200), cand("a2", 150), cand("a3", 100), cand("a4", 50), cand("a5", 20)]),
    p("B", "B", 300, [cand("b1", 150), cand("b2", 100), cand("b3", 50)]),
    p("C", "C", 180, [cand("c1", 100), cand("c2", 80)]),
  ]);
  const r = distribuirEstado(est, "variante");
  assert.equal(r.qe, 100);
  assert.deepEqual(r.linhas.map((l) => [l.sigla, l.vagas]), [["A", 5], ["B", 3], ["C", 2]]);
});

test("consolida estados no total nacional por partido", () => {
  const mk = (a, b) => d(a + b, [p("A", "A", a * 100, Array.from({ length: a }, (_, i) => cand("a" + i, 100))), p("B", "B", b * 100, Array.from({ length: b }, (_, i) => cand("b" + i, 100)))], { pctSecoes: 50 });
  const e1 = mk(3, 1), e2 = mk(1, 3);
  const nac = consolidarNacional([{ uf: "X", d: e1, dist: distribuirEstado(e1) }, { uf: "Y", d: e2, dist: distribuirEstado(e2) }]);
  assert.equal(nac.total, 8);
  assert.equal(nac.totalVagas, 8);
  assert.deepEqual(nac.partidos.map((x) => [x.sigla, x.vagas]), [["A", 4], ["B", 4]]);
  assert.equal(nac.partidos[0].porUF.X + nac.partidos[0].porUF.Y, 4);
});

test("cores: federação usa o primeiro partido; sem cor conhecida cai no cinza", () => {
  assert.equal(corPartido("PT/PC do B/PV"), corPartido("PT"));
  assert.equal(corPartido("UNIÃO"), corPartido("uniao"));
  assert.match(corPartido("XYZ"), /^#/);
});
