globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { statusEleicao, filtrarUfs, barraFiltros, filtrosVazios, STATUS } = await import("../public/filtros.js");

const d = (...sits) => ({ candidatos: sits.map((sit, i) => ({ id: String(i), nome: "C" + i, votos: 10, sit })) });

test("status da eleição de um estado", () => {
  assert.equal(statusEleicao(d("eleito", "eleito")), "definida");
  assert.equal(statusEleicao(d("segundo", "segundo", "")), "segundo");
  assert.equal(statusEleicao(d("", "")), "aberta");
  assert.equal(statusEleicao(null), "aberta");
  assert.equal(statusEleicao(undefined), "aberta");
});

const todas = ["AC", "AL", "RJ", "SP", "RS", "SC", "DF"];
const statusDe = (u) => ({ DF: "definida", RJ: "segundo", SP: "definida" }[u] ?? "aberta");

test("filtra por região, estado e situação, combinando os três", () => {
  assert.deepEqual(filtrarUfs(todas, filtrosVazios(), statusDe), todas);
  assert.deepEqual(filtrarUfs(todas, { regiao: "sul" }, statusDe), ["RS", "SC"]);
  assert.deepEqual(filtrarUfs(todas, { regiao: "sudeste" }, statusDe), ["RJ", "SP"]);
  assert.deepEqual(filtrarUfs(todas, { uf: "AC" }, statusDe), ["AC"]);
  assert.deepEqual(filtrarUfs(todas, { status: "definida" }, statusDe), ["SP", "DF"]);
  assert.deepEqual(filtrarUfs(todas, { status: "segundo" }, statusDe), ["RJ"]);
  assert.deepEqual(filtrarUfs(todas, { status: "aberta" }, statusDe), ["AC", "AL", "RS", "SC"]);
  assert.deepEqual(filtrarUfs(todas, { regiao: "sudeste", status: "definida" }, statusDe), ["SP"]);
  assert.deepEqual(filtrarUfs(todas, { regiao: "sul", uf: "AC" }, statusDe), []);
});

test("barra de filtros: situação e estado (a região é dos botões do topo), 2º turno só onde existe", () => {
  const com = barraFiltros(filtrosVazios(), {});
  assert.ok(com.includes('value="segundo"') && com.includes("data-f-status") && com.includes(">Todos<"));
  assert.ok(!com.includes("data-f-regiao") && !com.includes("data-f-limpar"));
  assert.ok(!barraFiltros(filtrosVazios(), { comSegundo: false }).includes('value="segundo"'));
  const sul = barraFiltros({ regiao: "sul", uf: "RS", status: "" }, {}); // a região só limita a lista de estados
  assert.equal((sul.match(/<option value="[A-Z]{2}"/g) || []).length, 3);
  assert.ok(sul.includes('value="RS" selected') && sul.includes("data-f-limpar"));
  assert.equal(STATUS.definida, "Eleição definida");
  assert.ok(barraFiltros(filtrosVazios(), { ordem: "pct" }).includes("data-ordem-sel") && !com.includes("data-ordem-sel"));
});
