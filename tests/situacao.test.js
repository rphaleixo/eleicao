globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { seloSit, seloProjetado, rotuloEleito, faixaDefinicao, situacaoEleicao, seloEleicao, legendaSituacao } = await import("../public/situacao.js");
const { normalizar } = await import("../public/tse.js");

const base = (md, extra = {}) => ({ md, v: { vv: "1000" }, carg: [{ cd: "3", nv: extra.nv ?? "1", agr: [{ n: "1", par: [{ sg: "PT", cand: [
  { n: "13", sqcand: "1", nm: "ANA", vap: "600", ...(extra.a || {}) }, { n: "22", sqcand: "2", nm: "BIA", vap: "300", ...(extra.b || {}) }, { n: "30", sqcand: "3", nm: "CID", vap: "100" }] }] }] }] });

test("candidato eleito e 2º turno marcados pelo TSE", () => {
  const d = normalizar(base("", { a: { e: "s", st: "Eleito" }, b: { st: "2º turno" } }));
  assert.equal(d.candidatos.find((c) => c.nome === "ANA").sit, "eleito");
  assert.equal(d.candidatos.find((c) => c.nome === "BIA").sit, "segundo");
  assert.equal(d.candidatos.find((c) => c.nome === "CID").sit, "");
});

test("quem vai ao 2º turno vem com e=\"s\" do TSE e não vira eleito", () => {
  const d = normalizar(base("s", { a: { e: "s", st: "2º turno" }, b: { e: "s", st: "2º turno" } }));
  assert.deepEqual(d.candidatos.map((c) => c.sit), ["segundo", "segundo", ""]);
});

test("eleição matematicamente definida marca os mais votados antes da totalização", () => {
  const e = normalizar(base("e"));
  assert.deepEqual(e.candidatos.map((c) => c.sit), ["eleito", "", ""]);
  const s = normalizar(base("s"));
  assert.deepEqual(s.candidatos.map((c) => c.sit), ["segundo", "segundo", ""]);
  const senado = normalizar(base("e", { nv: "2" }));
  assert.deepEqual(senado.candidatos.map((c) => c.sit), ["eleito", "eleito", ""]);
  assert.deepEqual(normalizar(base("")).candidatos.map((c) => c.sit), ["", "", ""]);
});

test("selos e faixa", () => {
  assert.match(seloSit({ sit: "eleito" }), /selo-sit eleito[\s\S]*Eleito/);
  assert.match(seloSit({ sit: "segundo" }), /selo-sit segundo[\s\S]*turno/);
  assert.equal(seloSit({ sit: "" }), "");
  assert.ok(!seloSit({ sit: "eleito" }, { curto: true }).includes("Eleito<"));
  const d = normalizar(base("s"));
  assert.equal(situacaoEleicao(d), "segundo");
  assert.match(faixaDefinicao(d), /Vai ao 2º turno[\s\S]*ANA × BIA/);
  assert.match(faixaDefinicao(normalizar(base("e"))), /Eleição definida[\s\S]*ANA eleito/);
  assert.equal(faixaDefinicao(normalizar(base(""))), "");
  assert.match(seloEleicao(normalizar(base("e"))), /Definida/);
  assert.ok(legendaSituacao().includes("Eleito") && legendaSituacao().includes("2º turno"));
  assert.ok(legendaSituacao(false).includes("Eleito") && !legendaSituacao(false).includes("2º turno"));
});

test("o Senado não tem 2º turno: nem pelo TSE nem pela definição matemática", () => {
  const senado = (md, st) => normalizar({ md, v: { vv: "1000" }, carg: [{ cd: "5", nv: "2", agr: [{ n: "1", par: [{ sg: "PT", cand: [
    { n: "13", sqcand: "1", nm: "ANA", vap: "600", e: st ? "s" : "n", st: st ?? "" }, { n: "22", sqcand: "2", nm: "BIA", vap: "300" }] }] }] }] });
  assert.deepEqual(senado("s").candidatos.map((c) => c.sit), ["", ""]);
  assert.deepEqual(senado("", "2º turno").candidatos.map((c) => c.sit), ["", ""]);
  assert.deepEqual(senado("", "Eleito").candidatos.map((c) => c.sit), ["eleito", ""]);
});

const arquivo = (cd, md, cands, nv = "1") => ({ md, v: { vv: "1000" }, carg: [{ cd, nv, agr: [{ n: "1", par: [{ sg: "PT", cand: cands }] }] }] });
const cands = (a, b) => [{ n: "13", sqcand: "1", nm: "ANA", vap: "600", ...a }, { n: "22", sqcand: "2", nm: "BIA", vap: "300", ...b }];

test("o status de eleito funciona em todos os cargos", () => {
  // marcado pelo TSE no candidato: Presidente (1), Governador (3), Senador (5), Deputado Federal (6) e Estadual (7)
  for (const cd of ["1", "3", "5", "6", "7"]) {
    const d = normalizar(arquivo(cd, "", cands({ e: "s", st: "Eleito" }, { e: "n", st: "Não eleito" })));
    assert.deepEqual(d.candidatos.map((c) => c.sit), ["eleito", ""], `cargo ${cd}`);
  }
  // deputados: eleito por QP ou por média, e suplente não é eleito
  const dep = normalizar(arquivo("6", "", cands({ e: "s", st: "Eleito por QP" }, { e: "n", st: "Suplente" }), "70"));
  assert.deepEqual(dep.candidatos.map((c) => c.sit), ["eleito", ""]);
  assert.equal(rotuloEleito(dep.candidatos[0]), "Eleito por QP");
  assert.equal(rotuloEleito({ situacao: "Eleito" }), "Eleito");
  assert.equal(rotuloEleito({ situacao: "" }), "Eleito");
  assert.match(seloSit(dep.candidatos[0], { rotulo: rotuloEleito(dep.candidatos[0]) }), /Eleito por QP/);
  assert.match(seloProjetado(), /selo-sit projetado[\s\S]*Projeção/);
});

test("definição matemática (md) só vale nas majoritárias; deputado não usa", () => {
  assert.deepEqual(normalizar(arquivo("3", "e", cands({}, {}))).candidatos.map((c) => c.sit), ["eleito", ""]);
  assert.deepEqual(normalizar(arquivo("1", "s", cands({}, {}))).candidatos.map((c) => c.sit), ["segundo", "segundo"]);
  assert.deepEqual(normalizar(arquivo("6", "e", cands({}, {}), "70")).candidatos.map((c) => c.sit), ["", ""]);
});
