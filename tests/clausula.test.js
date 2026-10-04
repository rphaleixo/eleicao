import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularClausula, blocoClausula, cardClausula, REGRA } from "../public/clausula.js";

// 10 estados, 100 votos válidos cada: o partido A tem 30% e 2 deputados em todos; o B, 1% e 0; o C, 2% e 1 só em dois estados.
const linha = (sigla, votos, vagas, valid = 100) => ({ sigla, votos, vagas, pctVotos: (votos / valid) * 100 });
const estados = (oficial) => Array.from({ length: 10 }, (_, i) => ({ uf: "U" + i, dist: { votosValidos: 100, oficial, linhas: [linha("AAA", 30, 2), linha("BBB", 1, 0), linha("CCC", 2, i < 2 ? 1 : 0)] } }));

test("atinge pelo caminho dos votos e/ou das cadeiras", () => {
  const c = calcularClausula(estados(false));
  const a = c.partidos.find((p) => p.sigla === "AAA");
  assert.equal(a.viaVotos, true); assert.equal(a.viaCadeiras, true); assert.equal(a.status, "atingiu"); // 30%, 10 UFs com 1,5%+, 20 deputados
  const b = c.partidos.find((p) => p.sigla === "BBB");
  assert.equal(b.atingiu, false); assert.equal(b.status, "andamento");
  assert.equal(c.partidos[0].sigla, "AAA"); // quem atingiu vem primeiro
  assert.equal(c.final, false);
});

test("só vira 'não atingiu' com a totalização final; 2,5% com poucas UFs não basta", () => {
  const c = calcularClausula(estados(true));
  assert.equal(c.final, true);
  assert.equal(c.partidos.find((p) => p.sigla === "BBB").status, "nao");
  const so9 = Array.from({ length: 10 }, (_, i) => ({ uf: "U" + i, dist: { votosValidos: 100, oficial: true, linhas: [linha("DDD", i < 8 ? 3 : 1, 0)] } }));
  const d = calcularClausula(so9).partidos[0]; // 26 de 100 = 2,6% no país, mas só 8 UFs com 1,5%
  assert.equal(d.ufsPct, 8); assert.equal(d.viaVotos, false); assert.equal(d.status, "nao");
});

test("card e bloco mostram resultado, metas e status", () => {
  const c = calcularClausula(estados(false));
  const h = cardClausula(c.partidos[0], false);
  assert.ok(h.includes("Atingindo na projeção") && h.includes(`de ${REGRA.deputados}`) && h.includes("Caminho 1") && h.includes("Caminho 2"));
  const bloco = blocoClausula(c, "nao");
  assert.ok(bloco.includes("BBB") && !bloco.includes(">AAA<") && bloco.includes("2,50%") && bloco.includes("projeção"));
});
