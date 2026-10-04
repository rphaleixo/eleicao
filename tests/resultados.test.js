import test from "node:test";
import assert from "node:assert/strict";
import { lerResultado, acrescentarResultado, UFS_MINUSCULAS } from "../worker/resultados.js";
import { CAMINHO_VALIDO } from "../worker/index.js";

const json = { v: { vv: "300" }, carg: [{ agr: [{ par: [{ sg: "PT", cand: [{ sqcand: "280001", nmu: "A", vap: "200" }] }, { sg: "PL", cand: [{ sqcand: "280002", nmu: "B", vap: "100" }] }] }] }] };

test("lê votos e nomes dos candidatos", () => {
  const { valor, nomes } = lerResultado(json);
  assert.deepEqual(valor, { vv: 300, c: { 280001: 200, 280002: 100 } });
  assert.deepEqual(nomes["280002"], { n: "B", p: "PL" });
});

test("só grava quando há votos e algo mudou", () => {
  const { valor, nomes } = lerResultado(json);
  const zero = { br: { vv: 0, c: { 280001: 0 } } };
  assert.equal(acrescentarResultado(null, zero, nomes).mudou, false);
  let r = acrescentarResultado(null, { br: valor }, nomes, 1000_000);
  assert.equal(r.mudou, true);
  assert.equal(acrescentarResultado(r.historico, { br: valor }, nomes, 1060_000).mudou, false);
  r = acrescentarResultado(r.historico, { br: { vv: 301, c: { 280001: 201, 280002: 100 } } }, nomes, 1120_000);
  assert.equal(r.historico.pontos.length, 2);
});

test("28 locais de votação (27 estados + exterior)", () => assert.equal(UFS_MINUSCULAS.length, 28));

test("fotos: aceita códigos de candidato com 11 ou 12 dígitos", () => {
  for (const sq of ["10002544107", "190002543271"]) assert.ok(CAMINHO_VALIDO.test(`ele2026/6259/fotos/ac/${sq}.jpeg`), sq);
  assert.ok(!CAMINHO_VALIDO.test("ele2026/6259/fotos/ac/abc.jpeg"));
});
