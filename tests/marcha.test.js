globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { agregar, REGIOES, telaMarcha, ufsVisiveis } = await import("../public/marcha.js");
const { UFS } = await import("../public/config.js");

const ufs = Object.fromEntries(Object.keys(UFS).map((u) => [u.toLowerCase(), { pct: 50, ts: 10, st: 5, andamento: "p", eleitores: 100, comparecimento: 40, abstencao: 10, dt: "", ht: "" }]));
ufs.br = { ...ufs.ac, ts: 270, st: 135 };
const ufsF = { ...ufs, zz: { pct: 10, ts: 5, st: 1, andamento: "p", eleitores: 50, comparecimento: 5, abstencao: 5, dt: "", ht: "" } };
const v = { f: { ufs: ufsF }, e: { ufs }, h: [], detalhe: { pres: null, gov: null, sen: null } };
const est = (o) => ({ uf: "BR", regiao: "", ordem: "az", ...o });

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

const detalhe = {
  pres: { candidatos: Array.from({ length: 7 }, (_, i) => ({ id: String(i), nome: "Cand " + i, partido: "P" + i, votos: 100 - i, pct: 10 - i })), votosValidos: 900, brancos: 60, nulos: 40, pctSecoes: 50, divulgaVotos: true },
  gov: null, sen: undefined,
};

test("exterior (ZZ) é um estado da lista", () => {
  assert.equal(ufsVisiveis("").length, 28);
  assert.deepEqual(ufsVisiveis("exterior"), ["ZZ"]);
  assert.ok(!ufsVisiveis("sul").includes("ZZ"));
});

test("tela do Brasil: painel único e lista de estados, sem seletor de eleição", () => {
  const h = telaMarcha(v, est({}));
  for (const t of ["Brasil", "Norte", "Acre", "Tocantins", "Exterior", 'data-uf="ZZ"', "anel", "Presentes", "Ausentes", "A apurar"]) assert.ok(h.includes(t), t);
  assert.ok(!h.includes("data-serie"));
  assert.equal((h.match(/class="card/g) || []).length, 2);
  assert.ok(!h.includes("expandido"));
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("Santa Catarina") && !sul.includes("Acre") && !sul.includes('data-uf="ZZ"'));
});

test("ordenar por % apurado", () => {
  const uf2 = { ...ufsF, sp: { ...ufsF.sp, pct: 99, st: 10, ts: 10 } };
  const h = telaMarcha({ ...v, f: { ufs: uf2 } }, est({ ordem: "pct" }));
  assert.ok(h.indexOf('data-uf="SP"') < h.indexOf('data-uf="AC"'));
});

test("estado aberto: resumo, gráfico e carrossel com top 5 e votos brancos/nulos/válidos", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "RJ" }));
  assert.ok(h.includes('aria-expanded="true"') && h.includes("expandido") && h.includes("carrossel"));
  assert.ok(h.includes("Eleitores aptos") && h.includes("Abstenções"));
  assert.equal((h.match(/data-sq=/g) || []).length, 5); // só os 5 primeiros do Presidente
  assert.ok(h.includes("Válidos") && h.includes("Brancos") && h.includes("Nulos"));
  assert.ok(h.includes("Dados indisponíveis") && h.includes("Carregando")); // Governador falhou, Senador ainda carregando
  assert.equal((h.match(/aria-expanded="true"/g) || []).length, 1);
});

test("exterior aberto mostra só o Presidente", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "ZZ" }));
  assert.ok(h.includes("expandido") && h.includes('data-ir="presidente"') && !h.includes('data-ir="governador"') && !h.includes('data-ir="senador"'));
});
