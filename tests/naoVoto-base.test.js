import test from "node:test";
import assert from "node:assert/strict";
globalThis.location = { search: "?turno=1" };
const { setBase } = await import("../public/base.js");
const { barrasComposicao, quadroComparacao, controlesComparacao, exteriorPorPais } = await import("../public/comparacaoView.js");
const { linhasDaBase, linhaDeResultado } = await import("../public/comparacao.js");
const { linhaComparacao } = await import("../public/comparar.js");
const { barrasPartidos } = await import("../public/graficoPartidos.js");
const { desempenhoPartidos } = await import("../public/desempenhoPartidos.js");
const { cartoesVotacao } = await import("../public/votacao.js");

// 1000 aptos: Lula 400, Flávio 300, outros 100; brancos 30, nulos 20, abstenção 150 (não voto = 200).
const l = { aptos: 1000, comparecimento: 850, abstencao: 150, brancos: 30, nulos: 20, lula: 400, flavio: 300, outros: 100, validos: 800, pct: 100 };
const NV = /Não voto|Não voto|não voto/;

test("base Votos válidos: barra, legenda, opções do mapa e Duelo não têm não voto, e a barra soma 100% com os candidatos", () => {
  const barras = barrasComposicao(l, l, "validos");
  assert.ok(!NV.test(barras)); // nem na barra nem na legenda
  assert.ok(barras.includes("50,00%") && barras.includes("37,50%") && barras.includes("12,50%")); // 400, 300 e 100 sobre 800 válidos
  assert.deepEqual(linhasDaBase("validos").map(([k]) => k), ["lula", "flavio", "outros"]);
  const ctl = controlesComparacao({ uf: "BR", mun: "", base: "validos", linha: "lula", medida: "pp", premissas: true }, { municipios: [] });
  assert.ok(!NV.test(ctl));
  assert.ok(!NV.test(quadroComparacao(l, l, { base: "validos", ondeNome: "Brasil", status2: "" }).replace("Variação em pontos percentuais", "")));
});

test("base Eleitores aptos: a barra inclui o não voto e soma 100% com ele", () => {
  const barras = barrasComposicao(l, l, "aptos");
  assert.ok(NV.test(barras) && barras.includes("20,00%")); // 200 de 1000
  assert.deepEqual(linhasDaBase("aptos").map(([k]) => k), ["lula", "flavio", "outros", "naovoto"]);
  assert.ok(quadroComparacao(l, l, { base: "aptos", ondeNome: "Brasil", status2: "" }).includes("Não voto"));
});

test("exterior por país em votos válidos não mostra não voto", () => {
  const paises = [{ pais: "Chile", cidades: [{ cod: "1", nome: "Santiago", l1: l, l2: null }], l1: l, l2: null, parcial2: false }];
  assert.ok(!NV.test(exteriorPorPais(paises, { base: "validos", ordem: "aptos", abertos: new Set(), limite: 10 })));
  assert.ok(NV.test(exteriorPorPais(paises, { base: "aptos", ordem: "aptos", abertos: new Set(), limite: 10 })));
});

test("Presidente, partidos e votação: em votos válidos nada de não voto; em Eleitores aptos entra", async () => {
  const d = { pctSecoes: 90, brancos: 30, nulos: 20, abstencao: 150, votosValidos: 800, eleitorado: { apuradas: 1000, abstencao: 150 }, votos: { total: 850, validos: 800, brancos: 30, nulos: 20 },
    candidatos: [{ id: "1", nome: "A", partido: "PT", votos: 400 }, { id: "2", nome: "B", partido: "PL", votos: 300 }, { id: "3", nome: "C", partido: "PSD", votos: 100 }],
    partidos: [{ sigla: "PT", votosNominais: 400, votosLegenda: 0, votosSJ: 0, candidatos: [] }, { sigla: "PL", votosNominais: 300, votosLegenda: 0, votosSJ: 0, candidatos: [] }, { sigla: "PSD", votosNominais: 100, votosLegenda: 0, votosSJ: 0, candidatos: [] }] };
  setBase("validos");
  const { blocoComparar } = await import("../public/comparar.js");
  const bloco = blocoComparar({ candidatos: d.candidatos, local: { rotulo: "Brasil", uf: "BR", d }, itens: [{ uf: "SP", d }], cmp: { a: "1", b: "2", ordem: "maiorMargem" } });
  assert.ok(!/Não voto|não voto/.test(bloco)); // nem a legenda, nem o texto, nem as linhas
  assert.equal(linhaComparacao("SP", d, "1", "2").pctNaoVoto, null);
  assert.equal(linhaComparacao("SP", d, "1", "2").pctA, 50); // 400 sobre 800 candidatos
  assert.ok(!barrasPartidos(d, { linhas: [{ sigla: "PT", vagas: 1 }] }).itens.some((i) => i.id === "__naovoto"));
  assert.equal(desempenhoPartidos([{ uf: "SP", d }]).naoVoto, null);
  assert.ok(!cartoesVotacao(d).includes("Em branco"));
  setBase("totais");
  assert.equal(linhaComparacao("SP", d, "1", "2").pctNaoVoto, 20);
  assert.ok(barrasPartidos(d, { linhas: [{ sigla: "PT", vagas: 1 }] }).itens.some((i) => i.id === "__naovoto"));
  assert.ok(desempenhoPartidos([{ uf: "SP", d }]).naoVoto);
  assert.ok(cartoesVotacao(d).includes("Em branco"));
  setBase("validos");
});

test("Geografia e Nulos usam a faixa de premissas fixa, com a base escrita", async () => {
  const { controlesGeo } = await import("../public/geoView.js");
  const { controlesNulos } = await import("../public/nulosView.js");
  const g = controlesGeo({ metricas: new Set(["abstencao"]), cargo: "presidente", visao: "taxa", uf: "RJ", min: 0, premissas: false }, { cargoAtivo: false });
  assert.ok(g.includes("el-premissas") && g.includes("Eleitores aptos") && g.includes("aria-expanded=\"false\"") && g.includes(" hidden"));
  const n = controlesNulos({ cargo: "3", visao: "locais", numero: "", mun: "", premissas: true }, { mapa: { topo: { 3: ["22"] }, nomes: {} }, municipios: [] });
  assert.ok(n.includes("el-premissas") && n.includes("Governador") && n.includes("aria-expanded=\"true\"") && !n.includes(" hidden"));
});
