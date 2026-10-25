import { test } from "node:test";
import assert from "node:assert/strict";
import { linhaDeResultado, linhaDeArquivo, naoVoto, percentual, compararLinhas, valorDoMapa, categoriaLider, classesDoMapa, extremos } from "../public/comparacao.js";
import { quadroComparacao, barrasComposicao, tabelaExtremos } from "../public/comparacaoView.js";

const d1 = { eleitorado: { apuradas: 1000, comparecimento: 800, abstencao: 200 }, brancos: 20, nulos: 30, votosValidos: 750, pctSecoes: 100,
  candidatos: [{ numero: "13", votos: 350 }, { numero: "22", votos: 300 }, { numero: "15", votos: 60 }, { numero: "30", votos: 40 }] };
const d2 = { eleitorado: { apuradas: 1010, comparecimento: 860, abstencao: 150 }, brancos: 10, nulos: 20, votosValidos: 830, pctSecoes: 90,
  candidatos: [{ numero: "13", votos: 400 }, { numero: "22", votos: 430 }] };

test("linha do turno: Lula, Flávio, outros e não voto", () => {
  const l = linhaDeResultado(d1);
  assert.equal(l.lula, 350); assert.equal(l.flavio, 300); assert.equal(l.outros, 100);
  assert.equal(naoVoto(l), 250);
  assert.equal(l.lula + l.flavio + l.outros + naoVoto(l), l.aptos); // votos válidos + não voto = aptos neste exemplo
  assert.equal(linhaDeResultado(null), null);
});

test("linha do arquivo por município", () => {
  const l = linhaDeArquivo(["RJ", "3304557", 1000, 800, 200, 20, 30, 350, 300, 100, 750, 100]);
  assert.equal(l.lula, 350); assert.equal(l.aptos, 1000); assert.equal(l.validos, 750);
});

test("percentuais: sobre aptos ou sobre válidos (o não voto sempre sobre os aptos)", () => {
  const l = linhaDeResultado(d1);
  assert.equal(percentual(l, "lula", "aptos"), 35);
  assert.equal(percentual(l, "lula", "validos"), (350 / 750) * 100);
  assert.equal(percentual(l, "naovoto", "validos"), 25);
});

test("comparação: variação em votos e em pontos percentuais; outros somem no 2º turno", () => {
  const r = compararLinhas(linhaDeResultado(d1), linhaDeResultado(d2), "aptos");
  const lula = r.find((x) => x.chave === "lula"), outros = r.find((x) => x.chave === "outros"), nv = r.find((x) => x.chave === "naovoto");
  assert.equal(lula.dv, 50); assert.ok(Math.abs(lula.dp - (400 / 1010 * 100 - 35)) < 1e-9);
  assert.equal(outros.v2, 0); assert.equal(outros.semNoTurno2, true); assert.equal(outros.dv, -100);
  assert.equal(nv.v1, 250); assert.equal(nv.v2, 180); assert.equal(nv.dv, -70);
  const sem = compararLinhas(linhaDeResultado(d1), null);
  assert.equal(sem[0].dv, null); assert.equal(sem[0].v2, null);
});

test("mapa: valores por medida e categoria de quem liderou", () => {
  const a = linhaDeResultado(d1), b = linhaDeResultado(d2);
  assert.equal(valorDoMapa(a, b, { linha: "lula", medida: "votos", base: "aptos" }), 50);
  assert.ok(Math.abs(valorDoMapa(a, b, { linha: "flavio", medida: "pp", base: "aptos" }) - (430 / 1010 * 100 - 30)) < 1e-9);
  assert.equal(valorDoMapa(a, null, { linha: "lula", medida: "pp", base: "aptos" }), null);
  assert.equal(valorDoMapa(a, null, { linha: "lula", medida: "p1", base: "aptos" }), 35);
  assert.equal(categoriaLider(a, b), 2); // Lula liderava no 1º turno e Flávio no 2º: virou para Flávio
  assert.equal(categoriaLider(b, a), 3);
  assert.equal(categoriaLider(a, null), null);
});

test("classes de cor da variação e maiores altas e quedas", () => {
  const cls = classesDoMapa([-5, -3, -0.01, 0.02, 3, 6], "pp");
  assert.equal(cls.classe(-5), 0); assert.equal(cls.classe(6), 4); assert.equal(cls.classe(0), 2);
  const it = [{ nome: "A", valor: 1 }, { nome: "B", valor: -4 }, { nome: "C", valor: 9 }, { nome: "D", valor: null }];
  assert.deepEqual(extremos(it, "alta", 2).map((i) => i.nome), ["C", "A"]);
  assert.deepEqual(extremos(it, "queda", 1).map((i) => i.nome), ["B"]);
});

test("quadro e barras mostram as quatro linhas, os dois turnos e a variação", () => {
  const html = quadroComparacao(linhaDeResultado(d1), linhaDeResultado(d2), { base: "aptos", ondeNome: "Brasil", status2: "" });
  for (const t of ["Lula", "Flávio Bolsonaro", "Outros candidatos", "Não voto", "sem candidato", "35,00%", "▲ +50", "+4,60 pp", "2º turno menos 1º turno"]) assert.ok(html.includes(t), t);
  assert.equal((barrasComposicao(linhaDeResultado(d1), null).match(/sem dados ainda/g) || []).length, 1);
  assert.match(tabelaExtremos([{ ibge: "1", nome: "X", uf: "RJ", l1: { aptos: 10 }, valor: 1.234 }], { medida: "pp", dir: "alta", linhaNome: "Lula" }), /\+1,23 pp/);
});

import { agruparPorPais, somarLinhas, linhaDeExterior, valorDeOrdem } from "../public/comparacao.js";
import { exteriorPorPais } from "../public/comparacaoView.js";
test("exterior por país: soma as cidades do mesmo país e ordena", () => {
  const l = (aptos, lula, flavio) => ({ aptos, comparecimento: 0, abstencao: aptos - lula - flavio, brancos: 0, nulos: 0, lula, flavio, outros: 0, validos: lula + flavio, pct: 100 });
  const t1 = new Map([["1", l(100, 30, 20)], ["2", l(50, 10, 10)], ["3", l(10, 5, 1)]]);
  const t2 = new Map([["1", l(100, 40, 20)], ["2", l(50, 15, 10)]]);
  const paises = { 1: ["LISBOA", "Portugal"], 2: ["PORTO", "Portugal"], 3: ["ROMA", "Itália"] };
  const g = agruparPorPais(t1, t2, paises);
  const pt = g.find((x) => x.pais === "Portugal"), it = g.find((x) => x.pais === "Itália");
  assert.equal(pt.l1.aptos, 150); assert.equal(pt.l2.lula, 55); assert.equal(pt.cidades.length, 2); assert.equal(pt.parcial2, false);
  assert.equal(it.l2, null);
  assert.ok(valorDeOrdem(pt, "aptos", "aptos") > valorDeOrdem(it, "aptos", "aptos"));
  assert.ok(valorDeOrdem(pt, "dp:lula", "aptos") > 0);
  const html = exteriorPorPais(g, { base: "aptos", ordem: "aptos", abertos: new Set(["Portugal"]), limite: 10 });
  assert.ok(html.includes("Portugal") && html.includes("LISBOA") && html.includes("PORTO") && !html.includes("ROMA <"));
  assert.equal(somarLinhas([null, null]), null);
  assert.equal(linhaDeExterior(["X", 10, 7, 3, 1, 1, 4, 3, 0, 7, 100]).lula, 4);
});
