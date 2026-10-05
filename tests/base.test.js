import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "../public/tse.js";
import { aplicarBaseNaView, listaCandidatos, naoVoto, setBase, sinteticos } from "../public/base.js";
import { agregarResultados } from "../public/agregado.js";
import { linhasResultado, temTotais } from "../public/graficos.js";
import { rankingMajoritario } from "../public/ranking.js";

// Caso do RJ (números do TSE): total apurado = comparecimento + abstenção.
const json = {
  carg: [{ cd: "3", nv: "1", agr: [{ par: [
    { sg: "PL", cand: [{ sqcand: "1", n: "22", nmu: "DOUGLAS", vap: "300", dvt: "Válido", e: "n" }] },
    { sg: "PSD", cand: [{ sqcand: "2", n: "55", nmu: "PAES", vap: "200", dvt: "Válido", e: "n" }] },
  ] }] }],
  v: { tv: "600", vvc: "500", vv: "500", vb: "60", tvn: "40" }, s: {}, e: { te: "1200", est: "1000", c: "600", a: "400" },
};

test("votos totais: base = aptos das seções apuradas; brancos, nulos e abstenções viram 'candidatos'", () => {
  const d = normalizar(json);
  assert.equal(d.candidatos[0].pctValido.toFixed(2), "60.00"); assert.equal(d.candidatos[0].pctTotal.toFixed(2), "30.00");
  const n = naoVoto(d);
  assert.equal(n.base, 1000); assert.equal(n.soma, 500); assert.equal(n.pctSoma, 50); assert.equal(n.pctAbstencao, 40);
  setBase("validos"); assert.equal(listaCandidatos(d).length, 2);
  setBase("totais");
  const lista = listaCandidatos(d);
  assert.deepEqual(lista.map((c) => c.id), ["__naovoto", "__abstencao", "1", "2", "__brancos", "__nulos"]); // por votos: 500, 400, 300, 200, 40, 60 -> brancos (60) antes de nulos (40)
  assert.equal(lista[0].id, "__naovoto"); assert.equal(sinteticos(d).length, 4);
  aplicarBaseNaView({ d, lista: [{ uf: "RJ", d }] });
  assert.equal(d.candidatos[0].pct.toFixed(2), "30.00");
  setBase("validos"); aplicarBaseNaView({ d });
  assert.equal(d.candidatos[0].pct.toFixed(2), "60.00");
});

test("região agregada e ranking seguem a base", () => {
  setBase("totais");
  const a = agregarResultados([normalizar(json), normalizar(json)]);
  assert.equal(a.candidatos[0].pct.toFixed(2), "30.00");
  const html = rankingMajoritario(normalizar(json), { aba: "governador", uf: "RJ" });
  assert.ok(html.includes("Não voto") && html.includes("sintetico") && html.includes("50,00%"));
  setBase("validos");
  assert.ok(!rankingMajoritario(normalizar(json), { aba: "governador", uf: "RJ" }).includes("Não voto"));
});

test("gráfico em votos totais usa os aptos apurados e traz a linha 'não voto'", () => {
  const rp = { cands: { 1: { n: "A", p: "PL" }, 2: { n: "B", p: "PT" } }, pontos: [{ t: 1000, v: { rj: { vv: 500, es: 1000, c: { 1: 300, 2: 200 } } } }] };
  assert.equal(temTotais(rp, "rj"), true); assert.equal(temTotais({ pontos: [{ t: 1, v: { rj: { vv: 5, c: {} } } }] }, "rj"), false);
  const svg = linhasResultado(rp, "rj", () => "#000", { base: "totais", ate: 1000 * 1000 + 600000 });
  assert.ok(svg.includes("g-naovoto") && svg.includes("Não voto") && svg.includes("50,00%"));
  assert.ok(!linhasResultado(rp, "rj", () => "#000", { base: "validos", ate: 1000 * 1000 + 600000 }).includes("g-naovoto"));
});
