globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { cardEstado, cardRegiao, abstencaoDe, gradeCards, linha2022 } = await import("../public/cardsEstados.js");

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
  assert.ok(h.indexOf("Ana") < h.indexOf("Bia") && h.indexOf("Bia") < h.indexOf("Cid")); // os 3 estão no card: 2 em destaque e 1 em linha compacta
  assert.equal((h.match(/class="cu-dest/g) || []).length, 2);
  assert.equal((h.match(/class="cu-menor/g) || []).length, 1);
  for (const t of ["60,00%", "40,00%", "12,50%", "300 votos", "100 votos", "Abstenção 20,00%", "1.000 eleitores", "Ver apuração completa", "cu-foto"]) assert.ok(h.includes(t), t);
});

test("card sem votos usa ordem alfabética; sem presença mostra traço; exterior vira EX", () => {
  const zero = { candidatos: [c("Zé", "A", 0, 0), c("Ana", "B", 0, 0), c("Mia", "C", 0, 0)], andamento: "n", pctSecoes: 0 };
  const h = cardEstado("ZZ", zero, { pct: 0, andamento: "n", eleitores: 5, comparecimento: 0, abstencao: 0 });
  assert.ok(h.indexOf("Ana") < h.indexOf("Mia") && h.indexOf("Mia") < h.indexOf("Zé") && h.includes(">EX<") && h.includes("Exterior") && !h.includes("Abstenção") && h.includes("0,00%"));
});

test("eleição definida, 2º turno, carregando e indisponível", () => {
  const eleito = { ...d, candidatos: d.candidatos.map((x) => (x.nome === "Ana" ? { ...x, sit: "eleito" } : x)) };
  const h = cardEstado("SP", eleito, u);
  assert.ok(h.includes("Definida") && h.includes("selo-sit eleito") && h.includes("eleicao-eleito") && h.includes("sit-eleito"));
  const seg = { ...d, candidatos: d.candidatos.map((x) => (x.nome !== "Cid" ? { ...x, sit: "segundo" } : x)) };
  const h2 = cardEstado("SP", seg, u);
  assert.ok(h2.includes("eleicao-segundo") && h2.includes("selo-sit segundo") && !h2.includes("selo-sit eleito"));
  assert.ok(cardEstado("SP", undefined, u).includes("Carregando"));
  assert.ok(cardEstado("SP", null, u).includes("indisponível"));
  assert.match(gradeCards([cardEstado("SP", d, u)]), /^<ul class="cards-estados">/);
});

test("5 candidatos por card e linha de corte no senado", () => {
  const seis = { ...d, vagas: 2, candidatos: ["A", "B", "C", "D", "E", "F"].map((n, i) => c(n, "P", 600 - i * 100, 10)) };
  const h = cardEstado("RJ", seis, u, "senador");
  assert.equal((h.match(/class="cu-dest/g) || []).length + (h.match(/class="cu-menor/g) || []).length, 5);
  assert.ok(h.includes("2 vagas") && !cardEstado("RJ", seis, u, "governador").includes("2 vagas"));
});


test("card de região: filtra pela região ao tocar e mostra 3 candidatos", () => {
  const seis = { ...d, candidatos: ["A", "B", "C", "D", "E", "F"].map((n, i) => c(n, "P", 600 - i * 100, 10)) };
  const h = cardRegiao("sul", "Sul", "S", seis, { pct: 40, andamento: "p", eleitores: 5000, comparecimento: 100, abstencao: 20 });
  assert.ok(h.includes('data-regiao="sul"') && !h.includes("data-uf") && h.includes(">S<") && h.includes("Sul"));
  assert.equal((h.match(/class="cu-dest/g) || []).length + (h.match(/class="cu-menor/g) || []).length, 3);
});

test("card do Senado mostra quem foi eleito em 2022", () => {
  const sen = { nome: "Ana Lima", partido: "PT", participacao: "1º Suplente", titular: "Dino" };
  const h = cardEstado("PI", d, u, "senador", 5, linha2022(sen));
  assert.ok(h.includes("Eleito em 2022") && h.includes("Ana Lima") && h.includes("1º Suplente de Dino"));
  assert.equal(linha2022(null), "");
  assert.ok(!cardEstado("PI", d, u, "governador").includes("Eleito em 2022"));
});
