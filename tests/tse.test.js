import test from "node:test";
import assert from "node:assert/strict";

globalThis.location = { search: "?ano=2022&ele=544" };
const { normalizar, num, urlResultado } = await import("../public/tse.js");

test("números no formato do TSE", () => {
  assert.equal(num("48,43"), 48.43);
  assert.equal(num("57259504"), 57259504);
  assert.equal(num(""), 0);
});

test("endereços dos arquivos", () => {
  assert.equal(urlResultado("presidente", "BR"),
    "/api/ele2022/544/dados-simplificados/br/br-c0001-e000544-r.json");
  assert.equal(urlResultado("governador", "SP"),
    "/api/ele2022/544/dados-simplificados/sp/sp-c0003-e000544-r.json");
  assert.equal(urlResultado("senador", "SP", "71072"),
    "/api/ele2022/544/dados/sp/sp71072-c0005-e000544-v.json");
});

test("normaliza lista simples de candidatos", () => {
  const d = normalizar({ pst: "12,5", vv: "1000", cand: [
    { n: "13", nm: "A", vap: "600", pvap: "60,00", e: "s", sqcand: "1" },
    { n: "22", nm: "B", vap: "400", pvap: "40,00", e: "n", sqcand: "2" }] });
  assert.equal(d.pctSecoes, 12.5);
  assert.equal(d.candidatos[0].votos, 600);
  assert.equal(d.candidatos[0].eleito, true);
});

test("normaliza agrupamentos (deputados)", () => {
  const d = normalizar({ carg: [{ agr: [{ n: "13", nm: "Federação X", tvtl: "10", tvtn: "90",
    cand: [{ n: "1300", nm: "Fulano", vap: "90", sqcand: "9" }] }] }] });
  assert.equal(d.partidos[0].votos, 100);
  assert.equal(d.candidatos[0].partido, "Federação X");
});
