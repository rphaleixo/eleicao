import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "../public/tse.js";
import { escolherMudancas } from "../worker/index.js";
import { lerResultado } from "../worker/resultados.js";

// Caso real (governo do RJ): um candidato com votos "anulado sub judice" fica na lista e entra na base de % do TSE (vvc).
const json = {
  carg: [{ cd: "3", nv: "1", agr: [{ par: [
    { sg: "PL", cand: [{ sqcand: "1", nmu: "DOUGLAS", vap: "3631147", dvt: "Válido", e: "n" }] },
    { sg: "PSD", cand: [{ sqcand: "2", nmu: "PAES", vap: "3061725", dvt: "Válido", e: "n" }] },
    { sg: "REPUBLICANOS", cand: [{ sqcand: "3", nmu: "GAROTINHO", vap: "231200", dvt: "Anulado sub judice", e: "n" }] },
  ] }] }],
  v: { vv: "6692872", vvc: "6924072", vansj: "231200" }, s: {}, e: {},
};

test("% dos candidatos usa a base do TSE (válidos + anulados sub judice), como no site oficial", () => {
  const d = normalizar(json);
  const pl = d.candidatos.find((c) => c.id === "1");
  assert.equal(pl.pct.toFixed(2), "52.44"); // 3.631.147 ÷ 6.924.072 (com a base errada, 54,26%)
  assert.equal(d.candidatos.reduce((s, c) => s + c.pct, 0).toFixed(2), "100.00"); // somam 100%
  assert.equal(lerResultado(json).valor.vv, 6924072); // o histórico dos gráficos usa a mesma base
});

test("sem vvc, cai para os votos válidos", () => {
  const d = normalizar({ ...json, v: { vv: "6692872" } });
  assert.equal(d.votosValidos, 6692872);
});

test("cron: só busca o que mudou, os que mais mudaram primeiro e dentro do teto", () => {
  const atual = { br: 50, ac: 10, al: 20, am: 30, ba: 5 }, guardado = { br: 49, ac: 10, al: 10, am: 29.9, ba: 0 };
  assert.deepEqual(escolherMudancas(["br", "ac", "al", "am", "ba"], atual, guardado, 3, "br"), ["br", "al", "ba"]);
  assert.deepEqual(escolherMudancas(["ac"], { ac: 10 }, { ac: 10 }, 5), []);
});
