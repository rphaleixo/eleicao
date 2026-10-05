import { test } from "node:test";
import assert from "node:assert/strict";
import { desempenhoPartidos, blocoDesempenhoPartidos } from "../public/desempenhoPartidos.js";

const cand = (id, nome, votos, extra = {}) => ({ id, nome, votos, ...extra });
const d = (valid, partidos, eleit) => ({ votosValidos: valid, votosSJ: 0, partidos, brancos: 10, nulos: 20, abstencao: 30, eleitorado: eleit ?? { apuradas: 1000, abstencao: 30 } });
const A = { sigla: "AAA", votosNominais: 600, votosLegenda: 100, votosSJ: 0, candidatos: [cand("1", "Ana", 300), cand("2", "Beto", 200), cand("3", "Caio", 60), cand("4", "Duda", 40)] };
const B = { sigla: "BBB", votosNominais: 200, votosLegenda: 100, votosSJ: 50, candidatos: [cand("5", "Eva", 150, { subJudice: true }), cand("6", "Fabio", 50)] };

test("soma votos, mantém só o top 3 e usa os votos válidos como base", () => {
  const r = desempenhoPartidos([{ uf: "AC", d: d(1000, [A, B]) }]);
  assert.equal(r.partidos[0].sigla, "AAA");
  assert.equal(r.partidos[0].total, 700);
  assert.equal(r.partidos[0].top.length, 3);
  assert.equal(r.partidos[0].top[0].pct, 30);
  assert.equal(r.naoVoto.soma, 60);
});

test("sem sub judice: tira os votos e os candidatos sub judice", () => {
  const r = desempenhoPartidos([{ uf: "AC", d: d(1000, [A, B]) }], { semSubJudice: true });
  const b = r.partidos.find((p) => p.sigla === "BBB");
  assert.equal(b.nominais, 150);
  assert.deepEqual(b.top.map((c) => c.nome), ["Fabio"]);
});

test("nacional: soma os estados e o top 3 vem de qualquer estado", () => {
  const r = desempenhoPartidos([{ uf: "AC", d: d(1000, [A]) }, { uf: "AL", d: d(500, [{ ...A, candidatos: [cand("9", "Zeca", 999)] }]) }]);
  assert.equal(r.partidos[0].nominais, 1200);
  assert.equal(r.partidos[0].top[0].nome, "Zeca");
  assert.equal(r.partidos[0].top[0].uf, "AL");
  assert.equal(r.naoVoto.base, 2000);
  assert.equal(r.validos, 1500);
});

test("o bloco mostra o não voto como um partido e as porcentagens com 2 casas", () => {
  const html = blocoDesempenhoPartidos(desempenhoPartidos([{ uf: "AC", d: d(1000, [A]) }]));
  assert.match(html, /Não voto/);
  assert.match(html, /30,00%/);
  assert.match(html, /data-sq="1"/);
});
