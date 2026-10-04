import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.location = { search: "" };
const { normalizar, num, urlsResultado, urlMunicipios } = await import("../public/tse.js");
const ler = (nome) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), "utf8"));

test("números no formato do TSE", () => {
  assert.equal(num("48,43"), 48.43);
  assert.equal(num("57259504"), 57259504);
  assert.equal(num(""), 0);
});

test("endereços: Presidente usa a eleição federal, demais cargos a estadual", () => {
  assert.equal(urlsResultado("presidente", "BR")[0],
    "/api/ele2026/6257/dados/br/br-c0001-e006257-u.json");
  assert.equal(urlsResultado("presidente", "SP", "71072")[0],
    "/api/ele2026/6257/dados/sp/sp71072-c0001-e006257-u.json");
  assert.equal(urlsResultado("governador", "SP")[0],
    "/api/ele2026/6259/dados/sp/sp-c0003-e006259-u.json");
  assert.equal(urlsResultado("senador", "SP", "71072")[0],
    "/api/ele2026/6259/dados/sp/sp71072-c0005-e006259-u.json");
  assert.equal(urlsResultado("dep-federal", "MG")[0],
    "/api/ele2026/6259/dados/mg/mg-c0006-e006259-u.json");
  assert.equal(urlMunicipios(), "/api/ele2026/6259/config/mun-e006259-cm.json");
});

test("arquivo real de Presidente 2026 (antes da apuração)", () => {
  const d = normalizar(ler("presidente-br-2026.json"));
  assert.equal(d.cargoNome, "Presidente");
  assert.equal(d.vagas, 1);
  assert.equal(d.candidatos.length, 12);
  assert.equal(d.pctSecoes, 0);
  assert.ok(d.candidatos.every((c) => c.votos === 0 && !c.eleito));
  assert.ok(d.candidatos.some((c) => c.nome === "LULA" && c.numero === "13"));
});

test("arquivo real de vereador 2024: federação e partido isolado", () => {
  const d = normalizar(ler("vereador-amostra-2024.json"));
  assert.equal(d.vagas, 55);
  assert.equal(d.qeTse, 105110);
  const fed = d.partidos.find((p) => p.federacao);
  assert.equal(fed.votos, fed.votosNominais + fed.votosLegenda);
  assert.ok(fed.votosLegenda > 0);
  const isolado = d.partidos.find((p) => !p.federacao);
  assert.ok(isolado.votos > 0, "partido isolado traz os totais dentro de par[]");
  const eleito = d.candidatos.find((c) => c.eleito);
  assert.ok(eleito && /^Eleito/.test(eleito.situacao));
});

test("candidato sub judice não é elegível", () => {
  const d = normalizar({ carg: [{ agr: [{ n: "1", nm: "X", tp: "i", par: [{ sg: "X", tvtn: "10", cand: [
    { sqcand: "1", nmu: "A", vap: "10", dvt: "Anulado sub judice" }] }] }] }] });
  assert.equal(d.candidatos[0].elegivel, false);
});
