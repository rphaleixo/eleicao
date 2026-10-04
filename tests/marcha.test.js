import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = { search: "" };
const { agregar, REGIOES, telaMarcha } = await import("../public/marcha.js");
const { UFS } = await import("../public/config.js");

test("regiões cobrem os 27 estados, sem repetição", () => {
  const todas = Object.values(REGIOES).flatMap((r) => r.ufs);
  assert.equal(todas.length, 27);
  assert.deepEqual([...new Set(todas)].sort(), Object.keys(UFS).sort());
});

test("agregar soma seções e calcula percentuais", () => {
  const a = agregar([{ ts: 100, st: 50, eleitores: 1000, comparecimento: 400, abstencao: 100 }, { ts: 100, st: 100, eleitores: 1000, comparecimento: 300, abstencao: 200 }, undefined]);
  assert.equal(a.pct, 75);
  assert.equal(a.comparecimento, 700);
  assert.equal(Math.round(a.pctAbst), 30);
});

const ufs = Object.fromEntries(Object.keys(UFS).map((u) => [u.toLowerCase(), { pct: 50, ts: 10, st: 5, andamento: "p", eleitores: 100, comparecimento: 40, abstencao: 10, dt: "", ht: "" }]));
ufs.br = { ...ufs.ac, ts: 270, st: 135 };
const v = { f: { ufs }, e: { ufs }, h: [], detalhe: { pres: null, gov: null, sen: null } };

test("tela do Brasil: seções, regiões, tabelas e filtro por região", () => {
  const h = telaMarcha(v, { uf: "BR", serie: "f", regiao: "" });
  for (const t of ["Brasil", "Por região", "Apuração por estado", "Comparecimento e abstenção por estado", "Nordeste", "Acre", "Tocantins"]) assert.ok(h.includes(t), t);
  const so = telaMarcha(v, { uf: "BR", serie: "e", regiao: "sul" });
  assert.ok(so.includes("Santa Catarina") && !so.includes("Acre"));
  assert.ok(so.includes('data-serie="e" aria-pressed="true"'));
});

test("tela do estado: detalhamento e atalhos", () => {
  const h = telaMarcha(v, { uf: "RJ", serie: "f", regiao: "" });
  assert.ok(h.includes("Rio de Janeiro") && h.includes("data-voltar") && h.includes('data-ir="dep-federal"'));
});
