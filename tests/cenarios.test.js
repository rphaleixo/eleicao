import { test } from "node:test";
import assert from "node:assert/strict";
import { REGRAS_SEM_MINIMO_INDIVIDUAL, contem, unirNoEstado, recalcularEstados, compararBancadas, mudancasPorEstado, candidatosQueMudam, rotuloNoCenario, CENARIOS } from "../public/cenarios.js";
import { distribuirEstado } from "../public/proporcional.js";

const cand = (id, votos, partido) => ({ id, nome: id, votos, partido, elegivel: true });
const part = (id, sigla, cands, legenda = 0) => ({ id, nome: sigla, sigla, nomeCompleto: sigla, federacao: sigla.includes("/"), votosNominais: cands.reduce((t, c) => t + c.votos, 0), votosLegenda: legenda, votos: cands.reduce((t, c) => t + c.votos, 0) + legenda, votosSJ: 0, vagasTse: null, candidatos: cands });
// 4 vagas, 1000 votos: QE = 250.
const estado = (uf) => {
  const d = { vagas: 4, totalizacaoFinal: true, candidatos: [], partidos: [
    part("1", "PCDOB / PT / PV", [cand("pt1", 200, "PT"), cand("pt2", 150, "PT")]), // 350
    part("2", "PSOL / REDE", [cand("ps1", 180, "PSOL"), cand("ps2", 120, "PSOL")]), // 300
    part("3", "PL", [cand("pl1", 340, "PL")]),                                      // 340
  ] };
  d.candidatos = d.partidos.flatMap((p) => p.candidatos);
  return { uf, d, dist: distribuirEstado(d) };
};

test("contem / unir: dois partidos viram um, com votos somados", () => {
  assert.equal(contem("PCDOB / PT / PV", "pt"), true); assert.equal(contem("PSOL / REDE", "PT"), false);
  const { d } = estado("SP");
  const u = unirNoEstado(d, ["PT", "PSOL"], "PT+PSOL");
  assert.equal(u.partidos.length, 2); const j = u.partidos.find((p) => p.sigla === "PT+PSOL");
  assert.equal(j.votos, 650); assert.equal(j.candidatos.length, 4); assert.deepEqual(j.candidatos.map((c) => c.id), ["pt1", "ps1", "pt2", "ps2"]);
  assert.equal(unirNoEstado({ ...d, partidos: d.partidos.slice(1) }, ["PT", "PSOL"], "x").partidos.length, 2); // só um lado disputou: nada muda
});

test("PSOL na federação do PT: a bancada unida pode ganhar o que separada perdia nas sobras", () => {
  const base = [estado("SP")], c = CENARIOS["psol-pt"];
  const cen = recalcularEstados(base, c);
  const cmp = compararBancadas(base, cen, { uniao: c.uniao });
  const grupo = cmp.linhas.find((l) => l.rotulo === c.uniao.rotulo);
  assert.equal(grupo.antes, base[0].dist.linhas.filter((l) => ["PCDOB / PT / PV", "PSOL / REDE"].includes(l.sigla)).reduce((t, l) => t + l.vagas, 0));
  assert.equal(cmp.totalAntes, 4); assert.equal(cmp.totalDepois, 4); // o total de cadeiras nunca muda
  assert.equal(rotuloNoCenario("PSOL / REDE", c.uniao), c.uniao.rotulo); assert.equal(rotuloNoCenario("PL", c.uniao), "PL");
  assert.equal(cmp.linhas.reduce((t, l) => t + l.delta, 0), 0); // o que um ganha, outro perde
});

test("sem mínimo individual: candidatos abaixo de 10% do QE passam a poder ser eleitos", () => {
  // 10 vagas e QE 100; o partido A tem QP 6 e só 4 candidatos com 10 votos ou mais.
  const d = { vagas: 10, totalizacaoFinal: true, candidatos: [], partidos: [
    part("A", "A", [cand("a1", 300, "A"), cand("a2", 250, "A"), cand("a3", 20, "A"), cand("a4", 15, "A"), cand("a5", 8, "A"), cand("a6", 7, "A")]),
    part("B", "B", [cand("b1", 200, "B"), cand("b2", 100, "B"), cand("b3", 60, "B"), cand("b4", 40, "B")]),
  ] };
  d.candidatos = d.partidos.flatMap((p) => p.candidatos);
  const base = [{ uf: "SP", d, dist: distribuirEstado(d) }];
  const cen = recalcularEstados(base, { regras: REGRAS_SEM_MINIMO_INDIVIDUAL });
  assert.deepEqual(base[0].dist.barrados.map((b) => b.id), ["a5", "a6"]); // com a regra, ficam de fora do quociente (aqui só entrariam na última rodada das sobras)
  assert.deepEqual(base[0].dist.eleitos.filter((e) => ["a5", "a6"].includes(e.id)).map((e) => e.via), ["sobra", "sobra"]);
  const doCenario = cen[0].dist.eleitos.filter((e) => ["a5", "a6"].includes(e.id));
  assert.deepEqual(doCenario.map((e) => e.via), ["quociente", "quociente"]); // sem o mínimo, ocupam a vaga do quociente partidário
  assert.equal(cen[0].dist.barrados.length, 0);
  const mud = candidatosQueMudam(base, cen);
  assert.equal(mud.entram.length, mud.saem.length); // o total de cadeiras é o mesmo

});

test("PDT, PSOL e Rede com o PT: uma federação só, com os três somados", () => {
  const c = CENARIOS["pdt-psol-rede-pt"];
  assert.deepEqual(c.uniao.termos, ["PT", "PSOL", "REDE", "PDT"]);
  const { d } = estado("SP");
  d.partidos.push(part("4", "PDT", [cand("pdt1", 100, "PDT")]));
  d.candidatos = d.partidos.flatMap((p) => p.candidatos);
  const u = unirNoEstado(d, c.uniao.termos, c.uniao.rotulo);
  assert.equal(u.partidos.length, 2); // PL e a federação gigante
  const j = u.partidos.find((p) => p.sigla === c.uniao.rotulo);
  assert.equal(j.votos, 750); assert.equal(j.candidatos.length, 5);
  assert.equal(rotuloNoCenario("PDT", c.uniao), c.uniao.rotulo); assert.equal(rotuloNoCenario("PSOL / REDE", c.uniao), c.uniao.rotulo); assert.equal(rotuloNoCenario("PL", c.uniao), "PL");
});
