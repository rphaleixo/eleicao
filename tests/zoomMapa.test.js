import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomar, mover, nivel } from "../public/zoomMapa.js";

const base = [0, 0, 100, 50];

test("aproximar em torno de um ponto mantém o ponto no mesmo lugar da tela", () => {
  const v = zoomar(base, base, 2, 25, 10);
  assert.deepEqual([v[2], v[3]], [50, 25]);
  assert.equal(25 - v[0], (25 - base[0]) / 2); // o ponto fica na mesma proporção da largura
  assert.equal(nivel(v, base), 2);
});

test("não afasta além do mapa inteiro nem aproxima além do máximo", () => {
  assert.deepEqual(zoomar(base, base, 0.5, 50, 25).slice(2), [100, 50]);
  const perto = zoomar(base, base, 1e6, 50, 25);
  assert.equal(perto[2], 100 / 80);
});

test("arrastar desloca a vista e não deixa o centro sair do mapa", () => {
  const v = zoomar(base, base, 4, 50, 25);
  const m = mover(v, base, 10, 5);
  assert.equal(m[0], v[0] + 10); assert.equal(m[1], v[1] + 5);
  const longe = mover(v, base, 1e6, 1e6);
  assert.ok(longe[0] + longe[2] / 2 <= 100 && longe[1] + longe[3] / 2 <= 50);
});
