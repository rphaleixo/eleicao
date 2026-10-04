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

test("barra de filtros: 2º turno só onde existe, estados limitados à região", () => {
  const com = barraFiltros(filtrosVazios(), { escopo: "x" });
  assert.ok(com.includes('data-f-status="segundo"') && com.includes('data-f-escopo="x"') && com.includes("Todos os estados"));
  assert.ok(!barraFiltros(filtrosVazios(), { comSegundo: false }).includes('data-f-status="segundo"'));
  const sul = barraFiltros({ regiao: "sul", uf: "RS", status: "" }, {});
  assert.equal((sul.match(/<option value="[A-Z]{2}"/g) || []).length, 3);
  assert.ok(sul.includes('value="RS" selected') && sul.includes('data-f-regiao="sul" data-f-escopo="filtros" aria-pressed="true"'));
  assert.equal(STATUS.definida, "Eleição definida");
  assert.ok(barraFiltros(filtrosVazios(), { exterior: true }).includes('data-f-regiao="exterior"'));
});
