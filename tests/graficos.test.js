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
  assert.match(svg, /30,00% presentes/);
});

test("evolução das seções e resultado também respeitam o início", () => {
  const antes = [{ t: T0 - 600, f: { br: 5 } }, { t: T0 - 60, f: { br: 6 } }];
  assert.match(linhaEvolucao(antes, (p) => p.f.br, { inicio: T0 * 1000 }), /começa quando a apuração iniciar/);
  const antesRp = { cands: { 1: { n: "A", p: "PT" } }, pontos: [{ t: T0 - 60, v: { br: { vv: 10, c: { 1: 5 } } } }] };
  assert.match(linhasResultado(antesRp, "br", () => "#000", { inicio: T0 * 1000 }), /começa quando os primeiros votos/);
  const rp = { cands: { 1: { n: "A", p: "PT" } }, pontos: [...antesRp.pontos, { t: T0 + 60, v: { br: { vv: 20, c: { 1: 10 } } } }] };
  const svg = linhasResultado(rp, "br", () => "#000", { inicio: T0 * 1000 });
  assert.match(svg, /50,00%/); // só o ponto depois do início, com 2 casas decimais
});

test("o eixo do tempo cresce até 'agora' e o valor se mantém", () => {
  const rp = { cands: { 1: { n: "A", p: "PT" } }, pontos: [{ t: T0 + 60, v: { br: { vv: 20, c: { 1: 10 } } } }] };
  const curto = linhasResultado(rp, "br", () => "#000", { inicio: T0 * 1000 });
  const longo = linhasResultado(rp, "br", () => "#000", { inicio: T0 * 1000, ate: (T0 + 7200) * 1000 });
  const x = (svg) => Number(/<circle cx="([\d.]+)"/.exec(svg)[1]);
  assert.ok(x(longo) > x(curto) || x(longo) === x(curto)); // o último ponto fica na ponta direita
  assert.ok(/<path class="g-cand" d="M[\d.,]+ L/.test(longo)); // a linha se estende até agora
});
