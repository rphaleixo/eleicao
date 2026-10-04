globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { cardEstado, abstencaoDe, gradeCards } = await import("../public/cardsEstados.js");

const c = (nome, partido, votos, pct) => ({ id: nome, nome, partido, votos, pct, numero: "1" });
const d = { candidatos: [c("Bia", "PT", 100, 40), c("Ana", "PL", 300, 60), c("Cid", "PSD", 50, 20)], definido: "", andamento: "p", pctSecoes: 50, votosValidos: 450 };
const u = { pct: 12.5, andamento: "p", eleitores: 1000, comparecimento: 800, abstencao: 200 };

test("abstenção sobre as seções já apuradas", () => {
  assert.equal(abstencaoDe(u), 20);
  assert.equal(abstencaoDe({ comparecimento: 0, abstencao: 0 }), null);
  assert.equal(abstencaoDe(undefined), null);
});

test("card: dois primeiros, % apurado e abstenção, tudo com 2 casas", () => {
  const h = cardEstado("RJ", d, u);
  assert.ok(h.includes("Rio de Janeiro") && h.includes('data-uf="RJ"'));
  assert.ok(h.indexOf("Ana") < h.indexOf("Bia") && !h.includes("Cid"));
  for (const t of ["60,00%", "40,00%", "12,50%", "20,00%", "300 votos", "100 votos", ">450<", ">1.000<", "cu-duelo"]) assert.ok(h.includes(t), t);
});

test("card sem votos usa ordem alfabética; sem presença mostra traço; exterior vira EX", () => {
  const zero = { candidatos: [c("Zé", "A", 0, 0), c("Ana", "B", 0, 0), c("Mia", "C", 0, 0)], andamento: "n", pctSecoes: 0 };
  const h = cardEstado("ZZ", zero, { pct: 0, andamento: "n", eleitores: 5, comparecimento: 0, abstencao: 0 });
  assert.ok(h.indexOf("Ana") < h.indexOf("Mia") && !h.includes("Zé") && h.includes(">EX<") && h.includes("Exterior") && h.includes("<b>–</b>") && h.includes("0,00%"));
});

test("estados definidos, carregando e indisponível", () => {
  assert.ok(cardEstado("SP", { ...d, definido: "e" }, u).includes("Eleito"));
  assert.ok(cardEstado("SP", { ...d, definido: "s" }, u).includes("2º turno"));
  assert.ok(cardEstado("SP", undefined, u).includes("Carregando"));
  assert.ok(cardEstado("SP", null, u).includes("indisponível"));
  assert.match(gradeCards([cardEstado("SP", d, u)]), /^<ul class="cards-estados">/);
});
