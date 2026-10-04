import test from "node:test";
import assert from "node:assert/strict";
import { htmlFicha, urlFotoFicha } from "../public/candidato.js";
import { fichaDoCandidato } from "../worker/candidato.js";

const ficha = {
  sq: 190002543271, eleicao: 6259, cargo: 6, cargoNome: "Deputado Federal", uf: "RJ", numero: 2020, nomeUrna: "FILIPE <PEREIRA>", nome: "FILIPE DE ALMEIDA PEREIRA",
  partido: "PODE", federacao: null, agremiacao: { tipo: "PARTIDO ISOLADO", nome: null, composicao: "PODE" }, julgamento: "DEFERIDO", destinacaoVotos: "Válido",
  idade: 42, reeleicao: "N", tetoGastos: 1270629.01, pessoa: { anoNascimento: 1983, genero: "MASCULINO", corRaca: "BRANCA", instrucao: "SUPERIOR COMPLETO", ocupacao: "EMPRESÁRIO", ufNascimento: "RJ" },
  outrasCandidaturas: [], bens: { total: 4000, itens: [{ tipo: "Caderneta de poupança", descricao: "POUPANÇA", valor: 4000 }] },
  historico: [{ ano: 2022, turno: 1, cargo_nome: "Deputado Estadual", uf: "RJ", municipio: "RIO DE JANEIRO", partido: "PODE", resultado: "Suplente" }],
};

test("ficha: escapa HTML, mostra bens, histórico e apuração", () => {
  const h = htmlFicha(ficha, { votos: 12345, pct: 1.5, situacao: null });
  assert.match(h, /FILIPE &lt;PEREIRA&gt;/);
  assert.match(h, /Patrimônio total/);
  assert.match(h, /Suplente/);
  assert.match(h, /12\.345/);
  assert.doesNotMatch(h, /<PEREIRA>/);
});

test("ficha sem apuração, bens ou histórico", () => {
  const h = htmlFicha({ ...ficha, bens: { total: 0, itens: [] }, historico: [] }, null);
  assert.match(h, /Nenhum bem declarado/);
  assert.match(h, /Sem candidaturas anteriores/);
  assert.doesNotMatch(h, /Na apuração/);
});

test("foto da ficha: presidente usa pasta br, demais a UF", () => {
  assert.equal(urlFotoFicha({ eleicao: 6257, uf: "BR", sq: 1 }), "/api/ele2026/6257/fotos/br/1.jpeg");
  assert.equal(urlFotoFicha({ eleicao: 6259, uf: "RJ", sq: 2 }), "/api/ele2026/6259/fotos/rj/2.jpeg");
});

test("fichaDoCandidato não devolve o identificador do CPF e trata candidato inexistente", async () => {
  const mk = (first, results) => ({
    prepare() { return { bind() { return this; }, first: async () => first, all: async () => ({ results: [] }) }; },
    batch: async () => results.map((r) => ({ results: r })),
  });
  assert.equal(await fichaDoCandidato(mk(null, []), 1), null);
  const c = { sq: 1, pessoa_id: "HASH-SECRETO", cargo: 6, uf: "RJ", sq_coligacao: 5, nome: "A", nome_urna: "A", numero: 1 };
  const f = await fichaDoCandidato(mk(c, [[], [{ tipo: "x", descricao: "y", valor: 10 }, { tipo: "x", descricao: "z", valor: 5 }], [], []]), 1);
  assert.equal(f.bens.total, 15);
  assert.equal(JSON.stringify(f).includes("HASH-SECRETO"), false);
});
