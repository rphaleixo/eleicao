import { test } from "node:test";
import assert from "node:assert/strict";
import { votadosDoEstado, top10Pais, blocoTop10, cardsMaisVotados } from "../public/deputadosVotados.js";
import { AGRUP_CAMARA } from "../public/camara.js";

const cand = (id, nome, votos, extra = {}) => ({ id, nome, partido: "PT", votos, pct: votos / 10, elegivel: true, sit: "", ...extra });
const est = (uf, cs, eleitos = []) => ({ uf, d: { pctSecoes: 50, candidatos: cs }, dist: { vagas: 8, eleitos } });
const estados = [
  est("SP", [cand("1", "ANA", 900), cand("2", "BIA", 300), cand("9", "ANULADO", 5000, { elegivel: false })], [{ id: "1" }]),
  est("RJ", [cand("3", "CAIO", 700, { sit: "eleito" }), cand("4", "DUDA", 0)]),
];

test("mais votados do estado: ignora zero e não elegíveis, marca eleito e projeção", () => {
  const sp = votadosDoEstado(estados[0]);
  assert.deepEqual(sp.map((c) => c.id), ["1", "2"]);
  assert.equal(sp[0].projetado, true); assert.equal(votadosDoEstado(estados[1])[0].oficial, true);
});

test("top 10 do país soma os estados e ordena por votos", () => {
  assert.deepEqual(top10Pais(estados).map((c) => c.id), ["1", "3", "2"]);
  assert.equal(top10Pais(estados, 2).length, 2);
  const html = blocoTop10(estados);
  assert.ok(html.indexOf("ANA") < html.indexOf("CAIO") && html.includes("São Paulo"));
});

test("cards por estado respeitam a lista de estados filtrada", () => {
  const h = cardsMaisVotados(estados, ["RJ"]);
  assert.ok(h.includes("Rio de Janeiro") && !h.includes("ANA") && h.includes('href="#/estados/RJ/dep-federal"'));
  assert.match(cardsMaisVotados(estados, []), /Nenhum estado/);
  assert.ok(AGRUP_CAMARA.top10 && AGRUP_CAMARA.votados);
});
