import test from "node:test";
import assert from "node:assert/strict";
import { areaPresenca, linhaEvolucao, linhasResultado } from "../public/graficos.js";

const T0 = 1_000_000; // início do gráfico (segundos)
const pt = (t, c, a, pst) => ({ t, f: { br: pst }, e: { br: pst }, p: { br: [c, a] } });

test("presença: ignora o que veio antes do início e parte de zero no início", () => {
  const antes = [pt(T0 - 600, 5, 5, 1), pt(T0 - 60, 6, 6, 2)];
  assert.match(areaPresenca(antes, "br", 100, { inicio: T0 * 1000 }), /começa quando a apuração iniciar/);
  const mistos = [...antes, pt(T0 + 600, 30, 10, 40)];
  const svg = areaPresenca(mistos, "br", 100, { inicio: T0 * 1000 });
  assert.match(svg, /<svg/);
  assert.match(svg, /30(,\d+)? presentes|30% presentes/);
});

test("evolução das seções e resultado também respeitam o início", () => {
  const antes = [{ t: T0 - 600, f: { br: 5 } }, { t: T0 - 60, f: { br: 6 } }];
  assert.match(linhaEvolucao(antes, (p) => p.f.br, { inicio: T0 * 1000 }), /começa quando a apuração iniciar/);
  const rp = { cands: { 1: { n: "A", p: "PT" } }, pontos: [{ t: T0 - 60, v: { br: { vv: 10, c: { 1: 5 } } } }, { t: T0 + 60, v: { br: { vv: 20, c: { 1: 10 } } } }] };
  assert.match(linhasResultado(rp, "br", () => "#000", { inicio: T0 * 1000 }), /começa quando os primeiros votos/); // só 1 ponto depois do início
});
