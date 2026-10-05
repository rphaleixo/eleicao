import { test } from "node:test";
import assert from "node:assert/strict";
import { lerAbUf, montarLinhas, calcular, classesDeCor, valorDaVisao, caixaDoCaminho, viewBoxDoEstado } from "../public/geo.js";
import { controlesGeo, tabelaGeo, legendaGeo, fichaGeo, nomeDasMetricas } from "../public/geoView.js";

const ab = { abr: [
  { tpabr: "uf", cdabr: "rj", e: { te: "999", est: "999", c: "1", a: "1" } },
  { tpabr: "mun", cdabr: "1", e: { te: "100", est: "100", c: "50", a: "50", pest: "100,00" } },
  { tpabr: "mun", cdabr: "2", e: { te: "100000", est: "100000", c: "99000", a: "1000", pest: "100,00" } },
] };
const municipios = { RJ: [{ cod: "1", nome: "Pequena", ibge: "1001" }, { cod: "2", nome: "Grande", ibge: "1002" }] };
const urna = (uf, cod) => ({ "1": { eleitorado: { apuradas: 100, abstencao: 50, comparecimento: 50 }, brancos: 5, nulos: 5, pctSecoes: 100 }, "2": { eleitorado: { apuradas: 100000, abstencao: 1000, comparecimento: 99000 }, brancos: 2000, nulos: 3000, pctSecoes: 100 } }[cod]);

test("lê a abstenção dos municípios de um estado, ignorando o total do estado", () => {
  const m = lerAbUf(ab);
  assert.equal(m.size, 2);
  assert.deepEqual(m.get("2"), { aptos: 100000, comparecimento: 99000, abstencao: 1000, pctSecoes: 100 });
});

test("50% de abstenção em 100 eleitores pesa menos que 1% em 100 mil", () => {
  const linhas = montarLinhas({ municipios, ab: new Map([["RJ", lerAbUf(ab)]]), urna: () => undefined });
  const c = calcular(linhas, { metricas: new Set(["abstencao"]) });
  const [p, g] = ["Pequena", "Grande"].map((n) => c.itens.find((l) => l.nome === n));
  assert.equal(p.taxa, 50); assert.equal(g.taxa, 1);
  assert.equal(valorDaVisao(p, "pessoas"), 50); assert.equal(valorDaVisao(g, "pessoas"), 1000);
  assert.ok(p.acima > 0 && g.acima < 0, "acima da média: a taxa de 50% em 100 eleitores é só ~49 pessoas além do esperado; 1% em 100 mil fica abaixo da taxa nacional");
  assert.ok(Math.abs(c.taxaNacional - (1050 / 100100) * 100) < 1e-9);
});

test("várias métricas somam; sem o dado de uma delas o município fica sem valor", () => {
  const sem = calcular(montarLinhas({ municipios, ab: new Map([["RJ", lerAbUf(ab)]]), urna: () => undefined }), { metricas: new Set(["abstencao", "brancos"]) });
  assert.equal(sem.municipios, 0); assert.equal(sem.semDado, 2);
  const com = calcular(montarLinhas({ municipios, ab: new Map([["RJ", lerAbUf(ab)]]), urna }), { metricas: new Set(["abstencao", "brancos", "nulos"]) });
  assert.equal(com.itens.find((l) => l.nome === "Grande").valor, 6000);
  assert.equal(com.itens.find((l) => l.nome === "Pequena").valor, 60);
});

test("o tamanho mínimo tira o município do mapa e da média", () => {
  const c = calcular(montarLinhas({ municipios, ab: new Map([["RJ", lerAbUf(ab)]]), urna }), { metricas: new Set(["abstencao"]), minimo: 10_000 });
  assert.equal(c.municipios, 1); assert.equal(c.totalAptos, 100000);
  assert.equal(c.itens.find((l) => l.nome === "Pequena").fora, true);
});

test("classes de cor: quintis para a taxa, neutra no meio para acima da média", () => {
  const itens = Array.from({ length: 10 }, (_, i) => ({ valor: i, aptos: 100, fora: false, taxa: i, acima: i - 4.5 }));
  const t = classesDeCor(itens, "taxa");
  assert.equal(t.classe(0), 0); assert.equal(t.classe(9), 4);
  const a = classesDeCor(itens, "acima");
  assert.equal(a.classe(-4.5), 0); assert.equal(a.classe(4.5), 4);
});

test("caixa de um caminho e enquadramento por estado", () => {
  assert.deepEqual(caixaDoCaminho("M0,0l10,0l0,20l-10,0z"), { minX: 0, minY: 0, maxX: 10, maxY: 20 });
  const malha = { viewBox: "0 0 1 1", caminhos: new Map([["a", "M0,0l10000,0l0,20000z"], ["b", "M50000,0l1000,1000z"]]) };
  assert.equal(viewBoxDoEstado(malha, ["a"]).split(" ").length, 4);
  assert.equal(viewBoxDoEstado(malha, ["x"]), "0 0 1 1");
});

test("a tela traz as três métricas, os três visões e a ficha com absolutos e percentuais", () => {
  const g = { metricas: new Set(["abstencao", "nulos"]), cargo: "governador", visao: "taxa", uf: "", min: 0, sel: "", pag: 1 };
  const html = controlesGeo(g, { cargoAtivo: true });
  for (const t of ["Abstenção", "Brancos", "Nulos", "Não voto (as três)", "Taxa (%)", "Pessoas", "Acima da média", "Governador"]) assert.match(html, new RegExp(t.replace(/[()]/g, "\\$&")));
  assert.equal(nomeDasMetricas(new Set(["brancos", "nulos"])), "brancos e nulos");
  assert.match(nomeDasMetricas(new Set(["abstencao", "brancos", "nulos"])), /não voto/);
  const c = calcular(montarLinhas({ municipios, ab: new Map([["RJ", lerAbUf(ab)]]), urna }), { metricas: new Set(["abstencao"]) });
  const ficha = fichaGeo(c.itens.find((l) => l.nome === "Grande"), { cargoNome: "Governador", metricas: new Set(["abstencao"]), totalValor: c.totalValor, taxaNacional: c.taxaNacional, ufNome: "Rio de Janeiro" });
  assert.match(ficha, /1\.000/); assert.match(ficha, /1,00%/); assert.match(ficha, /Não voto/);
  assert.match(tabelaGeo(c.itens, { visao: "acima", pagina: 1 }), /Grande/);
  assert.match(legendaGeo(classesDeCor(c.itens, "taxa"), "taxa", { semDado: 3, fora: 0 }), /sem dado/);
});
