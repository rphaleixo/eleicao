import test from "node:test";
import assert from "node:assert/strict";
import { buscarCidades, buscarCandidatos, maisProxima, acharCidade, htmlBusca, ATALHOS, CIDADES_POPULARES } from "../public/busca.js";

const municipios = { RJ: [{ cod: "60011", nome: "NITERÓI", ibge: "3303302" }, { cod: "60012", nome: "RIO DE JANEIRO", ibge: "3304557" }], SP: [{ cod: "71072", nome: "SÃO PAULO", ibge: "3550308" }, { cod: "71073", nome: "SÃO PAULINO", ibge: "1" }], ZZ: [{ cod: "1", nome: "SANTIAGO" }] };
const indice = [{ id: "1", nome: "LULA", numero: "13", partido: "PT", cargo: "presidente", uf: "BR" }, { id: "2", nome: "FLAVIO BOLSONARO", numero: "22", partido: "PL", cargo: "presidente", uf: "BR" }, { id: "3", nome: "ELMANO DE FREITAS", numero: "13", partido: "PT", cargo: "governador", uf: "CE" }];

test("cidades: ignora acento e caixa, exige 2 letras, limita a 5 e põe as que começam pelo texto primeiro", () => {
  assert.deepEqual(buscarCidades(municipios, "niteroi").map((m) => m.nome), ["NITERÓI"]);
  assert.deepEqual(buscarCidades(municipios, "n"), []);
  assert.deepEqual(buscarCidades(municipios, "sao paulo").map((m) => m.nome), ["SÃO PAULO", "SÃO PAULINO"].slice(0, 1)); // "paulino" não contém "paulo"
  assert.equal(buscarCidades(municipios, "santiago").length, 0); // exterior fica de fora
  assert.equal(buscarCidades({ SP: Array.from({ length: 9 }, (_, i) => ({ cod: String(i), nome: `CIDADE ${i}` })) }, "cidade").length, 5);
});

test("candidatos: por nome (todas as palavras) ou número", () => {
  assert.deepEqual(buscarCandidatos(indice, "bolsonaro flavio").map((c) => c.id), ["2"]);
  assert.deepEqual(buscarCandidatos(indice, "13").map((c) => c.id).sort(), ["1", "3"]);
  assert.deepEqual(buscarCandidatos(indice, "x"), []);
});

test("localização: a cidade popular mais próxima, e os atalhos existem na lista", () => {
  assert.deepEqual(maisProxima(-22.9, -43.2), { nome: "Rio de Janeiro", uf: "RJ" });
  assert.deepEqual(maisProxima(-23.5, -46.6), { nome: "São Paulo", uf: "SP" });
  assert.ok(ATALHOS.every((n) => CIDADES_POPULARES.some((c) => c[0] === n)));
  assert.equal(acharCidade(municipios, "Niterói", "RJ").cod, "60011");
});

test("janela: sem texto mostra a localização e as cidades populares; com texto, os grupos e a mensagem de nada encontrado", () => {
  const vazio = htmlBusca({ texto: "", candidatos: [], cidades: [] });
  assert.ok(vazio.includes("Usar minha localização") && vazio.includes("São Paulo") && vazio.includes('role="group"'));
  assert.ok(htmlBusca({ texto: "x", localizacao: "negada" }).includes("Não foi possível localizar"));
  const nada = htmlBusca({ texto: "zzzz", candidatos: [], cidades: [] });
  assert.ok(nada.includes("Nada encontrado para “zzzz”") && nada.includes("número do candidato"));
  const achou = htmlBusca({ texto: "lula", candidatos: [indice[0]], cidades: [] }, { corPartido: () => "red" });
  assert.ok(achou.includes('data-busca-cand="1"') && achou.includes("Presidente"));
});
