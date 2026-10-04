import test from "node:test";
import assert from "node:assert/strict";
import { agregarResultados, maisRecente } from "../public/agregado.js";

const d = (cands, extra = {}) => ({ cargoNome: "Presidente", vagas: 1, candidatos: cands.map(([numero, nome, votos]) => ({ id: numero, numero, nome, partido: "P" + numero, votos, pct: 0, eleito: false, situacao: "" })),
  votosValidos: cands.reduce((s, c) => s + c[2], 0), brancos: 10, nulos: 20, secoesTotal: 100, secoesApuradas: 50, comparecimento: 0, abstencao: 0, divulgaVotos: true, totalizacaoFinal: false, andamento: "p", ...extra });

test("soma os votos de cada candidato nos estados da região e recalcula o % sobre os válidos", () => {
  const r = agregarResultados([d([["13", "A", 600], ["22", "B", 400]]), d([["13", "A", 100], ["22", "B", 300]]), null]);
  assert.equal(r.candidatos[0].nome, "A");
  assert.equal(r.candidatos[0].votos, 700);
  assert.equal(r.votosValidos, 1400);
  assert.equal(r.candidatos[0].pct, 50);
  assert.equal(r.brancos, 20);
  assert.equal(r.pctSecoes, 50);
  assert.equal(r.andamento, "p");
});

test("sem dados devolve nulo; todos finalizados = finalizada", () => {
  assert.equal(agregarResultados([null]), null);
  assert.equal(agregarResultados([d([["13", "A", 1]], { andamento: "f" }), d([["13", "A", 1]], { andamento: "f" })]).andamento, "f");
});

test("a situação de eleito ou 2º turno de um estado não passa para a região", () => {
  const com = d([["13", "A", 600], ["22", "B", 400]]);
  com.candidatos[0].sit = "segundo";
  const r = agregarResultados([com, d([["13", "A", 100], ["22", "B", 300]])]);
  assert.ok(r.candidatos.every((c) => c.sit === ""));
});

test("o horário mais recente entre os estados", () => {
  assert.equal(maisRecente(["04/10/2026 18:19:48", "04/10/2026 18:25:29", "", null, "03/10/2026 23:59:59"]), "04/10/2026 18:25:29");
  assert.equal(maisRecente([]), "");
  const r = agregarResultados([d([["13", "A", 1]], { atualizadoEm: "04/10/2026 18:00:00" }), d([["13", "A", 1]], { atualizadoEm: "04/10/2026 18:30:00" })]);
  assert.equal(r.atualizadoEm, "04/10/2026 18:30:00");
});
