import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularClausula, blocoClausula, cardClausula, REGRA } from "../public/clausula.js";

// 10 estados, 100 votos válidos cada: o partido A tem 30% e 2 deputados em todos; o B, 1% e 0; o C, 2% e 1 só em dois estados.
const linha = (sigla, votos, vagas, valid = 100) => ({ sigla, votos, vagas, pctVotos: (votos / valid) * 100 });
const estados = (oficial) => Array.from({ length: 10 }, (_, i) => ({ uf: "U" + i, dist: { votosValidos: 100, oficial, linhas: [linha("AAA", 30, 2), linha("BBB", 1, 0), linha("CCC", 2, i < 2 ? 1 : 0)] } }));
// Com a apuração em 90% (eleitorado informado), ainda sobra voto para quem está perto; com 99,9%, não.
const comEleitorado = (apuradas) => estados(false).map((e) => ({ ...e, d: { eleitorado: { apto: 1000, apuradas } } }));

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
  const bloco = blocoClausula(c, "andamento");
  assert.ok(bloco.includes("BBB") && !bloco.includes(">AAA<") && bloco.includes("2,50%") && bloco.includes("projeção"));
});

test("'não atingiu' antes do fim: quando nem recebendo todos os votos que faltam o partido chega lá", () => {
  const tarde = calcularClausula(comEleitorado(999)); // 0,1% do eleitorado ainda por apurar
  assert.equal(tarde.final, false);
  const b = tarde.partidos.find((p) => p.sigla === "BBB");
  assert.equal(b.inviavel, true); assert.equal(b.status, "nao"); assert.ok(b.maxPctNac < 2.5);
  assert.equal(tarde.partidos.find((p) => p.sigla === "AAA").status, "atingiu"); // quem já cumpre segue como atingiu
  const cedo = calcularClausula(comEleitorado(500)); // metade ainda por apurar: tudo pode mudar
  assert.equal(cedo.partidos.find((p) => p.sigla === "BBB").status, "andamento");
  assert.ok(cardClausula(b, false).includes("não há como atingir") && cardClausula(b, false).includes("precisa de 9"));
  assert.match(blocoClausula(tarde, "nao"), /BBB/); assert.ok(!blocoClausula(tarde, "andamento").includes(">BBB<"));
});
