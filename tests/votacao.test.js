globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { cardVotacao, cardEleitorado } = await import("../public/votacao.js");
const { rankingMajoritario, ordenarCandidatos } = await import("../public/ranking.js");
const { normalizar } = await import("../public/tse.js");

const json = { v: { tv: "1000", vvc: "900", vv: "850", vnom: "800", vl: "50", van: "30", vansj: "20", vb: "60", tvn: "40", vn: "40" }, e: { te: "2000", est: "1200", c: "1000", a: "200" },
  carg: [{ cd: "6", nv: "70", agr: [{ n: "13", par: [{ sg: "PT", cand: [{ n: "1300", sqcand: "1", nm: "A", vap: "500" }] }] }] }] };
const d = normalizar(json);

test("normalizar traz a composição dos votos e do eleitorado", () => {
  assert.deepEqual(d.votos, { total: 1000, nominais: 900, validos: 850, nominaisValidos: 800, legenda: 50, anulados: 30, anuladosSubJudice: 20, brancos: 60, nulos: 40 });
  assert.deepEqual(d.eleitorado, { apto: 2000, apuradas: 1200, comparecimento: 1000, abstencao: 200 });
});

test("cartão Votação: majoritária e proporcional (com votos na legenda)", () => {
  const m = cardVotacao(d);
  for (const t of ["Nominais", "Válidos", "Anulados sub judice", "Em branco", "Nulos", "1.000 votos", "85,00%", "6,00%"]) assert.ok(m.includes(t), t);
  assert.ok(!m.includes("Na legenda"));
  const pr = cardVotacao(d, { proporcional: true });
  assert.ok(pr.includes("Na legenda") && pr.includes("5,00%") && pr.includes("Candidatos e legendas"));
});

test("cartão Eleitorado: % sobre as seções totalizadas", () => {
  const h = cardEleitorado(d);
  assert.ok(h.includes("Eleitorado apto") && h.includes("2.000") && h.includes("1.200") && h.includes("83,33%") && h.includes("16,67%"));
});

const cand = (i, nome, votos) => ({ id: String(i), numero: String(i), nome, partido: "P" + i, votos, pct: votos / 10, eleito: false, situacao: "", elegivel: true, situacaoVoto: "" });

test("ranking: 3 em destaque com foto e o resto em lista compacta sem foto", () => {
  const dd = { vagas: 1, candidatos: [cand(1, "A", 500), cand(2, "B", 300), cand(3, "C", 100), cand(4, "D", 60), cand(5, "E", 40)] };
  const h = rankingMajoritario(dd, { aba: "governador", uf: "RJ" });
  assert.equal((h.match(/class="foto pod-foto"/g) || []).length, 3);
  assert.equal((h.match(/class="cr"/g) || []).length, 2);
  assert.equal((h.match(/<img/g) || []).length, 3); // a lista compacta não tem foto
  assert.ok(h.indexOf("pod-1") < h.indexOf("pod-2") && h.includes('start="4"'));
});

test("ranking sem votos: ordem alfabética; senador com linha de corte", () => {
  const dd = { vagas: 2, candidatos: ["Zé", "Ana", "Mia", "Bia", "Cléo"].map((n, i) => cand(i, n, 0)) };
  assert.deepEqual(ordenarCandidatos(dd.candidatos).map((c) => c.nome), ["Ana", "Bia", "Cléo", "Mia", "Zé"]);
  const h = rankingMajoritario(dd, { aba: "senador", uf: "SP" });
  assert.ok(h.indexOf("Ana") < h.indexOf("Bia") && h.includes("ocupam as vagas de senador"));
});
