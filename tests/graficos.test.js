import test from "node:test";
import assert from "node:assert/strict";
import { areaPresenca, linhaEvolucao, linhasResultado } from "../public/graficos.js";

const T0 = 1_000_000; // início do gráfico (segundos)
const pt = (t, c, a, pst) => ({ t, f: { br: pst }, e: { br: pst }, p: { br: [c, a] } });

test("presença: ignora o que veio antes do início e parte de zero no início", () => {
  const antes = [pt(T0 - 600, 5, 5, 1), pt(T0 - 60, 6, 6, 2)];
  assert.match(areaPresenca(antes, "br", 100, { inicio: T0 * 1000 }), /começa quando a apuração iniciar/);
  const mistos = [...antes, pt(T0 + 600, 30, 10, 40)];
  const svg = areaPresenca(mistos, "br", 100, { inicio: T0 * 1000, ate: (T0 + 1200) * 1000 });
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

test("gráficos começam na primeira apuração e são consultáveis", async () => {
  const { indiceEm, instanteEm } = await import("../public/graficoInterativo.js");
  const pts = [{ t: T0 + 60, f: { br: 0 } }, { t: T0 + 600, f: { br: 10 } }, { t: T0 + 1200, f: { br: 20 } }];
  const svg = linhaEvolucao(pts, (p) => p.f.br, { inicio: T0 * 1000, ate: (T0 + 1500) * 1000 });
  const g = JSON.parse(svg.match(/data-g="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<"));
  assert.equal(g.t0, (T0 + 600) * 1000); // zero não conta: começa quando a apuração começou
  assert.deepEqual(g.series[0].v.slice(0, 2), [10, 20]);
  assert.ok(svg.includes("g-info"));
  assert.equal(indiceEm(g.ts, g.t0 - 1), 0);
  assert.equal(indiceEm(g.ts, (T0 + 1300) * 1000), 1);
  assert.equal(instanteEm(g, g.e), g.t0);
  assert.equal(instanteEm(g, g.l - g.d), g.t1);
});

test("presença: linha de % de urnas apuradas a cada minuto (recorte único)", () => {
  const pts = [0, 1, 2].map((i) => ({ t: T0 + 60 + i * 60, f: { br: 10 * (i + 1) }, p: { br: [100 * (i + 1), 20 * (i + 1)] } }));
  const svg = areaPresenca(pts, "br", 1000, { inicio: T0 * 1000, ate: (T0 + 400) * 1000 });
  assert.ok(svg.includes('class="g-urnas"') && svg.includes("Urnas apuradas"));
  assert.ok(!areaPresenca(pts, ["br", "rj"], 1000, { inicio: T0 * 1000, ate: (T0 + 400) * 1000 }).includes("g-urnas")); // soma de vários locais: sem a linha
});
