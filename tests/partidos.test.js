import { test } from "node:test";
import assert from "node:assert/strict";
import { listaDePartidos, resultadoMajoritario, resumoMajoritario, desempenhoDeputados, desempenhoPartido, blocoPartido } from "../public/partidos.js";
import { lerRota, montarRota } from "../public/rota.js";

const c = (id, nome, partido, votos, extra = {}) => ({ id, nome, partido, votos, pct: votos / 10, elegivel: true, sit: "", ...extra });
const gov = (cs, extra = {}) => ({ vagas: 1, totalizacaoFinal: false, votosValidos: 1000, candidatos: cs, ...extra });

test("resultado de cada candidato majoritário: vitória, 2º turno, derrota ou em aberto", () => {
  const def = gov([c("1", "A", "PT", 600, { sit: "eleito" }), c("2", "B", "PL", 300), c("3", "C", "PSD", 100)]);
  assert.equal(resultadoMajoritario(def.candidatos[0], def, "governador"), "vitoria");
  assert.equal(resultadoMajoritario(def.candidatos[1], def, "governador"), "derrota"); // eleição definida sem ele
  const aberta = gov([c("1", "A", "PT", 400), c("2", "B", "PL", 350)]);
  assert.equal(resultadoMajoritario(aberta.candidatos[1], aberta, "governador"), "aberto");
  assert.equal(resultadoMajoritario(c("9", "X", "PL", 1, { sit: "segundo" }), aberta, "governador"), "segundo");
  const sen = gov([c("1", "A", "PT", 300, { sit: "eleito" }), c("2", "B", "PL", 280, { sit: "eleito" }), c("3", "C", "PSD", 100)], { vagas: 2 });
  assert.equal(resultadoMajoritario(sen.candidatos[2], sen, "senador"), "derrota"); // as duas vagas já têm dono
  assert.equal(resultadoMajoritario(sen.candidatos[2], gov(sen.candidatos.slice(0, 1), { vagas: 2 }), "senador"), "aberto");
});

test("resumo: vitórias x derrotas e % dos válidos do partido", () => {
  const r = resumoMajoritario([{ resultado: "vitoria", votos: 600, validos: 1000 }, { resultado: "derrota", votos: 100, validos: 1000 }, { resultado: "segundo", votos: 300, validos: 1000 }, { resultado: "aberto", votos: 0, validos: 0 }]);
  assert.deepEqual([r.candidaturas, r.vitorias, r.derrotas, r.segundos, r.abertas, r.votos], [4, 1, 1, 1, 1, 1000]);
  assert.equal(r.pct, (1000 / 3000) * 100);
});

test("deputados do partido: eleitos pela distribuição, votos e bancada da federação", () => {
  const d = { vagas: 2, totalizacaoFinal: false, candidatos: [c("1", "A", "PT", 500, { federacao: "PT / PV" }), c("2", "B", "PV", 300, { federacao: "PT / PV" }), c("3", "C", "PT", 100, { federacao: "PT / PV" }), c("4", "D", "PL", 400)] };
  const dist = { vagas: 2, votosValidos: 1300, oficial: false, eleitos: [{ id: "1" }, { id: "4" }], linhas: [{ sigla: "PT / PV", votos: 900, vagas: 1 }, { sigla: "PL", votos: 400, vagas: 1 }] };
  const dd = desempenhoDeputados("PT", [{ uf: "SP", d, dist }]);
  assert.equal(dd.eleitos, 1); assert.equal(dd.candidatos, 2); assert.equal(dd.votosNominais, 600); assert.equal(dd.federacao, "PT / PV"); assert.equal(dd.bancadaFed, 1);
  assert.deepEqual(dd.porUf[0].nomes, ["A"]);
  assert.equal(desempenhoDeputados("NOVO", [{ uf: "SP", d, dist }]).candidatos, 0);
});

test("lista de partidos, visão completa e rota do partido", () => {
  const dados = { pres: gov([c("1", "L", "PT", 500, { sit: "segundo" })]), gov: [{ uf: "SP", d: gov([c("2", "G", "PT", 600, { sit: "eleito" }), c("3", "H", "PL", 300)]) }], sen: [], depf: null, depe: null };
  assert.deepEqual(listaDePartidos(dados).map((p) => p.sigla), ["PL", "PT"]);
  const des = desempenhoPartido("PT", dados);
  assert.equal(des.resumo.total.vitorias, 1); assert.equal(des.resumo.total.segundos, 1); assert.equal(des.depf, null);
  const h = blocoPartido(des, "");
  assert.ok(h.includes("Eleições majoritárias") && h.includes("Saldo nas majoritárias") && h.includes("Carregando deputados federais"));
  const rota = lerRota("#/partidos/UNI%C3%83O", { ufs: { SP: "São Paulo" }, ufPadrao: "SP" });
  assert.equal(rota.aba, "partidos"); assert.equal(rota.partido, "UNIÃO"); assert.equal(montarRota({ aba: "partidos", partido: "UNIÃO" }), "#/partidos/UNI%C3%83O");
});
