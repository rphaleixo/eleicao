import test from "node:test";
import assert from "node:assert/strict";
import { senadoresEleitosEm2022 } from "../worker/senado.js";

const item = (nome, uf, inicio1, num1, extra = {}) => ({
  IdentificacaoParlamentar: { CodigoParlamentar: nome, NomeParlamentar: nome, SiglaPartidoParlamentar: extra.partido ?? "PT", UrlFotoParlamentar: "http://x/f.jpg" },
  Mandato: { UfParlamentar: uf, PrimeiraLegislaturaDoMandato: { NumeroLegislatura: num1, DataInicio: inicio1 },
    SegundaLegislaturaDoMandato: num1 === "57" ? { NumeroLegislatura: "58", DataInicio: "2027-02-01" } : { NumeroLegislatura: "57", DataInicio: "2023-02-01" },
    DescricaoParticipacao: extra.part ?? "Titular", ...(extra.titular ? { Titular: { NomeParlamentar: extra.titular } } : {}) },
});
const json = (itens) => ({ ListaParlamentarEmExercicio: { Metadados: { Versao: "v1" }, Parlamentares: { Parlamentar: itens } } });

test("só entram os mandatos cuja PRIMEIRA legislatura começou em 2023-02-01 (eleitos em 2022)", () => {
  const r = senadoresEleitosEm2022(json([
    item("Ana", "RJ", "2023-02-01", "57"),
    item("Bia", "SP", "2019-02-01", "56"), // a 2ª legislatura dela também começa em 2023-02-01: não pode contar
    item("Cid", "MG", "2023-02-01", "57", { part: "1º Suplente", titular: "Dino" }),
  ]));
  assert.deepEqual(r.senadores.map((s) => s.nome), ["Cid", "Ana"]); // ordenado por UF: MG, RJ
  assert.equal(r.total, 2);
  assert.equal(r.senadores[0].participacao, "1º Suplente");
  assert.equal(r.senadores[0].titular, "Dino");
  assert.equal(r.senadores[1].titular, null);
  assert.equal(r.senadores[0].foto, "https://x/f.jpg");
  assert.equal(r.versao, "v1");
});

test("arquivo vazio ou fora do formato não quebra", () => {
  assert.deepEqual(senadoresEleitosEm2022({}).senadores, []);
  assert.deepEqual(senadoresEleitosEm2022(null).senadores, []);
});
