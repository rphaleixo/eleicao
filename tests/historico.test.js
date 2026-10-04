import test from "node:test";
import assert from "node:assert/strict";
import { pontoDeAcompanhamento, presencaDeAcompanhamento, acrescentar } from "../worker/historico.js";

test("andamento por estado a partir do arquivo de acompanhamento", () => {
  const p = pontoDeAcompanhamento({ abr: [
    { cdabr: "sp", s: { pst: "12,34" } }, { cdabr: "BR", s: { pst: "5,5" } }, { cdabr: "ac", s: { pst: "0,00" } },
  ] });
  assert.deepEqual(p, { sp: 12.34, br: 5.5, ac: 0 });
});

test("histórico só cresce quando algo mudou", () => {
  let h = { pontos: [] };
  let r = acrescentar(h, { f: { br: 0 }, e: { br: 0 } }, 1000_000);
  assert.equal(r.mudou, true); h = r.historico;
  r = acrescentar(h, { f: { br: 0 }, e: { br: 0 } }, 1060_000);
  assert.equal(r.mudou, false);
  r = acrescentar(h, { f: { br: 1.5 }, e: { br: 0 } }, 1120_000);
  assert.equal(r.mudou, true);
  assert.equal(r.historico.pontos.length, 2);
  assert.equal(r.historico.pontos[1].t, 1120);
});

test("presença (compareceram, abstiveram) por estado", () => {
  const p = presencaDeAcompanhamento({ abr: [{ cdabr: "BR", e: { c: "1.000", a: "200" } }, { cdabr: "zz", e: { c: "5", a: "7" } }, { cdabr: "ac", e: {} }] });
  assert.deepEqual(p, { br: [1000, 200], zz: [5, 7], ac: [0, 0] });
});

test("mudança só na presença também gera nova foto", () => {
  let r = acrescentar({ pontos: [] }, { f: { br: 1 }, e: { br: 1 }, p: { br: [10, 2] } }, 1000_000);
  r = acrescentar(r.historico, { f: { br: 1 }, e: { br: 1 }, p: { br: [10, 2] } }, 1060_000);
  assert.equal(r.mudou, false);
  r = acrescentar(r.historico, { f: { br: 1 }, e: { br: 1 }, p: { br: [11, 2] } }, 1120_000);
  assert.equal(r.mudou, true);
  assert.deepEqual(r.historico.pontos[1].p, { br: [11, 2] });
});
