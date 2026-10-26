import { test } from "node:test";
import assert from "node:assert/strict";
import { telaCompleta, acFinal, fim } from "../public/encerramento.js";

const ac = (br) => ({ ufs: { br } });
const final = ac({ andamento: "f", ts: 10, st: 10 }), parcial = ac({ andamento: "p", ts: 10, st: 9 });
const dFim = { totalizacaoFinal: true, pctSecoes: 100 }, dParcial = { totalizacaoFinal: false, pctSecoes: 99.9, andamento: "p" };

test("acompanhamento final: 'f' do TSE ou todas as seções apuradas", () => {
  assert.equal(acFinal(final), true); assert.equal(acFinal(parcial), false); assert.equal(acFinal(ac({ andamento: "p", ts: 10, st: 10 })), true); assert.equal(acFinal(null), false);
  assert.equal(fim(dFim), true); assert.equal(fim(dParcial), false);
});

test("só para de buscar quando tudo da tela é final e o segundo plano chegou", () => {
  assert.equal(telaCompleta({ tipo: "andamento", f: final, e: final }, { uf: "BR" }), true);
  assert.equal(telaCompleta({ tipo: "andamento", f: final, e: parcial }, { uf: "BR" }), false);
  // 2º turno: a Apuração só é "encerrada" depois que o resultado das disputas do 2º turno chegou (senão os cartões ficam presos nos números do 1º turno)
  const v2 = { tipo: "andamento", f: final, e: final, exigeDisputas2: true };
  assert.equal(telaCompleta(v2, { uf: "BR" }, () => false), false);
  assert.equal(telaCompleta(v2, { uf: "BR" }, (ks) => ks.includes("disputas2")), true);
  assert.equal(telaCompleta({ ...v2, exigeDisputas2: false }, { uf: "BR" }, () => false), true);
  assert.equal(telaCompleta({ tipo: "andamento", f: final, e: final }, { uf: "RJ" }, () => false), false); // resumo do estado ainda não chegou
  const lista = [{ uf: "SP", d: dFim }, { uf: "RJ", d: dFim }];
  assert.equal(telaCompleta({ tipo: "cargo-por-estado", cargo: "governador", e: final, lista }, {}), true);
  assert.equal(telaCompleta({ tipo: "cargo-por-estado", cargo: "governador", e: final, lista: [...lista, { uf: "MG", d: dParcial }] }, {}), false);
  assert.equal(telaCompleta({ tipo: "cargo-por-estado", cargo: "governador", e: final, lista: null }, {}), false);
  assert.equal(telaCompleta({ tipo: "presidente", ac: final, d: dFim, lista }, {}), true);
  assert.equal(telaCompleta({ tipo: "presidente", ac: final, d: dParcial, lista }, {}), false); // o arquivo do cargo ainda não fechou
  assert.equal(telaCompleta({ tipo: "estados", cargo: "mapa" }, {}), false);
  assert.equal(telaCompleta({ tipo: "estados", cargo: "governador", e: final, d: dFim }, {}), true);
  assert.equal(telaCompleta({ tipo: "partidos", final: true, pres: dFim, gov: lista, sen: lista, depf: lista, depe: lista }, {}), true);
  assert.equal(telaCompleta({ tipo: "partidos", final: false, pres: dFim, gov: lista, sen: lista, depf: lista, depe: lista }, {}), false);
});
