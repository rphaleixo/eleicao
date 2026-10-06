import { test } from "node:test";
import assert from "node:assert/strict";
import { rotuloNumero, rankingNumeros, pontosDoMapa, zonasEmDestaque, corPorParticipacao } from "../public/nulos.js";
import { mapaNulos, rankingNulos, controlesNulos, tabelaZonas } from "../public/nulosView.js";

const nomes = { partidos: { 13: "PT", 12: "PDT", 55: "PSD", 22: "PL" }, candidatos: { 3: { 22: "DOUGLAS (PL)", 55: "PAES (PSD)" }, 5: { 555: "FULANO (PSD)", 222: "CICLANO (PL)" } } };

test("rótulo do número digitado: zeros, partido sem candidato, dígito errado, candidato e outros", () => {
  assert.equal(rotuloNumero("00", "3", nomes).tipo, "zero");
  assert.equal(rotuloNumero("000", "5", nomes).tipo, "zero");
  const pt = rotuloNumero("13", "3", nomes); assert.equal(pt.tipo, "partido-sem-candidato"); assert.match(pt.texto, /PT.*governador/);
  assert.equal(rotuloNumero("551", "5", nomes).tipo, "partido-numero-errado");
  assert.equal(rotuloNumero("222", "5", nomes).tipo, "candidato");
  assert.equal(rotuloNumero("99", "3", nomes).tipo, "outro");
});

const resumo = { total: { 3: { nulos: [["00", 60], ["13", 30], ["99", 10]], repeticao: [] }, 5: { nulos: [], repeticao: [["222", 5]] } },
  municipios: { 1: { zonas: { "0001": { total: { 3: { nulos: [["00", 20], ["13", 20]] } } } } } } };
const mapa = { topo: { 3: ["00", "13", "12"] }, nomes, uf: "RJ", locais: [
  { m: "1", mn: "MUN", z: "0001", nl: "Escola A", b: "Centro", la: -22.9, lo: -43.2, u: 4, c: { 3: [30, [20, 10, 0], [["00", 20], ["13", 10]]] } },
  { m: "1", mn: "MUN", z: "0001", nl: "Escola B", b: "Centro", la: -22.8, lo: -43.1, u: 6, c: { 3: [10, [0, 10, 0], [["13", 10]]] } },
  { m: "2", mn: "OUTRO", z: "0002", nl: "Escola C", b: "X", la: -22.7, lo: -43.0, u: 2, c: { 3: [0, [0, 0, 0], []] } },
] };

test("ranking: % dos nulos, zeros e números de partido sem candidato", () => {
  const r = rankingNumeros(resumo.total, "3", nomes);
  assert.equal(r.total, 100); assert.equal(r.zero, 60); assert.equal(r.semCandidato, 30);
  assert.equal(r.itens[1].pct, 30);
  assert.equal(rankingNumeros(resumo.total, "5", nomes).repeticao[0].dig, "222");
});

test("pontos do mapa: um por local com nulos; número escolhido muda a medida; zonas somam os locais", () => {
  const locais = pontosDoMapa(mapa, resumo, "3");
  assert.equal(locais.length, 2); assert.equal(locais.find((p) => p.nome === "Escola A").dig, "00");
  const treze = pontosDoMapa(mapa, resumo, "3", { numero: "13" });
  assert.equal(treze.find((p) => p.nome === "Escola B").share, 100); assert.equal(treze.find((p) => p.nome === "Escola A").qtd, 10);
  assert.equal(pontosDoMapa(mapa, resumo, "3", { municipio: "2" }).length, 0);
  const zonas = pontosDoMapa(mapa, resumo, "3", { visao: "zonas" });
  assert.equal(zonas.length, 1); assert.equal(zonas[0].u, 10); assert.equal(zonas[0].n, 40);
  assert.equal(zonasEmDestaque(zonas, "13")[0].share, 50);
  assert.match(corPorParticipacao(50, 100), /^rgb\(/);
});

test("a tela monta mapa, ranking, controles e tabela de zonas", () => {
  const malha = { viewBox: "-44 -23 2 2", caminhos: new Map([["1", "M0,0l10,0l0,10z"]]) };
  const html = mapaNulos(malha, pontosDoMapa(mapa, resumo, "3"), { numero: "", selecionado: "", municipioIbge: "", topoNumeros: mapa.topo[3] });
  assert.equal((html.match(/<circle/g) || []).length, 2);
  assert.match(rankingNulos(rankingNumeros(resumo.total, "3", nomes), { titulo: "T" }), /60,00%/);
  assert.match(controlesNulos({ cargo: "3", visao: "locais", numero: "", mun: "" }, { mapa, municipios: [{ cod: "1", nome: "MUN" }] }), /Zonas eleitorais/);
  assert.match(tabelaZonas(pontosDoMapa(mapa, resumo, "3", { visao: "zonas" }), { numero: "", limite: 5 }), /Zona 1/);
});
