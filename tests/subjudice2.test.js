import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "../public/tse.js";
import { aplicarBaseNaView, listaCandidatos, setBase, setSemSubJudice, semSubJudice, candidatosReais } from "../public/base.js";
import { distribuirEstado } from "../public/proporcional.js";
import { agregarResultados } from "../public/agregado.js";
import { linhasResultado } from "../public/graficos.js";

// Governo do RJ (números reais do TSE): com os sub judice na base, Douglas fica abaixo de 50%; sem eles, passa.
const json = (pst = "85,38") => ({
  carg: [{ cd: "3", nv: "1", agr: [{ par: [
    { sg: "PL", cand: [{ sqcand: "1", n: "22", nmu: "DOUGLAS", vap: "3631147", dvt: "Válido", e: "n" }] },
    { sg: "PSD", cand: [{ sqcand: "2", n: "55", nmu: "PAES", vap: "3061725", dvt: "Válido", e: "n" }] },
    { sg: "REPUBLICANOS", cand: [{ sqcand: "3", n: "10", nmu: "GAROTINHO", vap: "231200", dvt: "Anulado sub judice", e: "n" }] },
  ] }] }],
  v: { vv: "6692872", vvc: "6924072", vansj: "231200" }, s: { pst }, e: { te: "9000000", est: "7000000", c: "6000000", a: "1000000" }, md: "n",
});

test("cenário sem sub judice recalcula %, tira o candidato e define a maioria", () => {
  setBase("validos"); setSemSubJudice(false);
  const d = normalizar(json());
  aplicarBaseNaView({ d });
  assert.equal(d.candidatos.find((c) => c.id === "1").pct.toFixed(2), "52.44"); assert.equal(d.candidatos.find((c) => c.id === "1").sit, "");
  setSemSubJudice(true); assert.equal(semSubJudice(), true);
  aplicarBaseNaView({ d });
  const douglas = d.candidatos.find((c) => c.id === "1");
  assert.equal(douglas.pct.toFixed(2), "54.25"); // 3.631.147 ÷ 6.692.872
  assert.equal(douglas.sit, "eleito"); assert.equal(douglas.sitProjetada, true); // apuração em 85%: projeção
  assert.deepEqual(listaCandidatos(d).map((c) => c.id), ["1", "2"]); assert.equal(candidatosReais(d).length, 2);
  assert.equal(d.votosValidos, 6692872);
  const final = normalizar(json("100,00")); aplicarBaseNaView({ d: final });
  assert.equal(final.candidatos.find((c) => c.id === "1").sitProjetada, false);
  setSemSubJudice(false); aplicarBaseNaView({ d });
  assert.equal(douglas.sit, ""); assert.equal(d.votosValidos, 6924072); // volta ao oficial
  setBase("totais"); setSemSubJudice(true); assert.equal(semSubJudice(), false); // só existe em votos válidos
  setBase("validos"); setSemSubJudice(false);
});

test("região agregada e cadeiras acompanham o cenário", () => {
  setBase("validos"); setSemSubJudice(true);
  const a = agregarResultados([normalizar(json()), normalizar(json())]);
  assert.equal(a.candidatos.find((c) => c.id === "1").pct.toFixed(2), "54.25");
  setSemSubJudice(false);
  // proporcional: os votos dos candidatos sub judice saem do partido
  const d = { vagas: 1, totalizacaoFinal: true, partidos: [
    { id: "1", sigla: "A", nome: "A", votos: 600, votosSJ: 0, vagasTse: 1, candidatos: [{ id: "a", nome: "a", votos: 600, elegivel: true }] },
    { id: "2", sigla: "B", nome: "B", votos: 500, votosSJ: 200, vagasTse: 0, candidatos: [{ id: "b", nome: "b", votos: 300, elegivel: true }, { id: "c", nome: "c", votos: 200, elegivel: false }] },
  ] };
  assert.equal(distribuirEstado(d, "2026", 0, false).oficial, true);
  const sem = distribuirEstado(d, "2026", 0, true);
  assert.equal(sem.oficial, false); assert.equal(sem.linhas.find((l) => l.sigla === "B").votos, 300);
});

test("gráfico sem sub judice: tira o candidato e a base", () => {
  const rp = { cands: { 1: { n: "A", p: "PL" }, 2: { n: "B", p: "PT" }, 3: { n: "C", p: "PP" } }, pontos: [{ t: 1000, v: { rj: { vv: 1000, c: { 1: 500, 2: 300, 3: 200 } } } }] };
  const svg = linhasResultado(rp, "rj", () => "#000", { ate: 1000 * 1000 + 600000, excluir: ["3"] });
  assert.ok(svg.includes("A") && !svg.includes(">C <") && svg.includes("62,50%")); // 500 ÷ (1000 − 200)
});
