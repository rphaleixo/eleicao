globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { agregar, REGIOES, telaMarcha, ufsVisiveis } = await import("../public/marcha.js");
const { UFS } = await import("../public/config.js");

const ufs = Object.fromEntries(Object.keys(UFS).map((u) => [u.toLowerCase(), { pct: 50, ts: 10, st: 5, andamento: "p", eleitores: 100, comparecimento: 40, abstencao: 10, dt: "", ht: "" }]));
ufs.br = { ...ufs.ac, ts: 270, st: 135 };
const ufsF = { ...ufs, zz: { pct: 10, ts: 5, st: 1, andamento: "p", eleitores: 50, comparecimento: 5, abstencao: 5, dt: "", ht: "" } };
const v = { f: { ufs: ufsF }, e: { ufs }, h: [], detalhe: { pres: null, gov: null, sen: null } };
const est = (o) => ({ uf: "BR", serie: "f", regiao: "", ordem: "az", ...o });

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

test("exterior (ZZ) é um estado só na eleição presidencial", () => {
  assert.equal(ufsVisiveis("", "f").length, 28);
  assert.equal(ufsVisiveis("", "e").length, 27);
  assert.deepEqual(ufsVisiveis("exterior", "f"), ["ZZ"]);
  assert.deepEqual(ufsVisiveis("exterior", "e"), []);
  assert.ok(!ufsVisiveis("sul", "f").includes("ZZ"));
});

test("tela do Brasil: painel, chips de região e lista de estados com Exterior", () => {
  const h = telaMarcha(v, est({}));
  for (const t of ["Brasil", "Norte", "Acre", "Tocantins", "Exterior", 'data-uf="ZZ"', "anel"]) assert.ok(h.includes(t), t);
  assert.equal((h.match(/class="card/g) || []).length, 2); // só dois blocos: painel e estados
  const e = telaMarcha(v, est({ serie: "e" }));
  assert.ok(!e.includes('data-uf="ZZ"') && e.includes("só para Presidente") && e.includes('data-serie="e" aria-pressed="true"'));
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("Santa Catarina") && !sul.includes("Acre") && !sul.includes('data-uf="ZZ"'));
});

test("ordenar por % apurado", () => {
  const uf2 = { ...ufsF, sp: { ...ufsF.sp, pct: 99, st: 10, ts: 10 } };
  const h = telaMarcha({ ...v, f: { ufs: uf2 } }, est({ ordem: "pct" }));
  assert.ok(h.indexOf('data-uf="SP"') < h.indexOf('data-uf="AC"'));
});

test("detalhe do estado e do exterior", () => {
  const rj = telaMarcha(v, est({ uf: "RJ" }));
  assert.ok(rj.includes("Rio de Janeiro") && rj.includes("data-voltar") && rj.includes('data-ir="dep-federal"') && rj.includes("data-serie"));
  const zz = telaMarcha(v, est({ uf: "ZZ", serie: "e" }));
  assert.ok(zz.includes("Exterior") && !zz.includes("data-serie") && !zz.includes('data-ir="governador"') && zz.includes('data-ir="presidente"'));
});
