import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.location = { search: "?turno=1" }; // fixa o 1º turno: sem isso o resultado dos testes mudaria com a data
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

test("só candidato com destinação 'Válido' pode ser eleito", () => {
  const dv = (dvt) => normalizar({ carg: [{ agr: [{ n: "1", nm: "X", tp: "i", par: [{ sg: "X", tvtn: "10", cand: [
    { sqcand: "1", nmu: "A", vap: "10", dvt }] }] }] }] }).candidatos[0].elegivel;
  assert.equal(dv("Válido"), true);
  assert.equal(dv("Anulado sub judice"), false);
  assert.equal(dv("Anulado"), false);
  assert.equal(dv("Válido (legenda)"), false);
});

test("município sempre com 5 dígitos, sem endereços alternativos", () => {
  assert.deepEqual(urlsResultado("governador", "AC", "1120"),
    ["/api/ele2026/6259/dados/ac/ac01120-c0003-e006259-u.json"]);
  assert.equal(urlsResultado("senador", "SP").length, 1);
});

test("estado da apuração, matematicamente definido e divulgação (EA20)", () => {
  const base = { carg: [{ nv: "1", agr: [] }] };
  const a = normalizar({ ...base, and: "p", tf: "n", dv: "n", md: "s" });
  assert.equal(a.andamento, "p");
  assert.equal(a.divulgaVotos, false);
  assert.equal(a.definido, "s");
  const b = normalizar({ ...base, and: "f", tf: "s", dv: "s", md: "n", esae: "s", mnae: [{ ds: "Pendência judicial" }] });
  assert.equal(b.totalizacaoFinal, true);
  assert.equal(b.definido, "");
  assert.equal(b.semEleito, true);
  assert.deepEqual(b.motivosSemEleito, ["Pendência judicial"]);
});

test("% do candidato = votos no candidato ÷ votos válidos (soma dos candidatos)", () => {
  const json = { v: { vv: "1000", vb: "10", vn: "20" }, carg: [{ cd: "3", nv: "1", agr: [{ n: "13", par: [{ sg: "PT", cand: [{ n: "13", sqcand: "1", nm: "A", vap: "600", pvap: "99,99" }, { n: "22", sqcand: "2", nm: "B", vap: "250", pvap: "1,00" }] }] }] }] };
  const d = normalizar(json);
  assert.equal(d.candidatos[0].pct.toFixed(2), "70.59"); // 600 ÷ 850
  assert.equal(d.candidatos[1].pct.toFixed(2), "29.41");
});

test("regra de votos válidos: brancos, nulos e abstenções ficam fora; os candidatos somam 100% mesmo se o campo do TSE vier errado", () => {
  // vvc "errado" de propósito: inclui 150 brancos e 100 nulos. A base certa é a soma dos candidatos (600 + 250 = 850).
  const json = { v: { vvc: "1100", vv: "1100", vb: "150", tvn: "100" }, e: { te: "2000", est: "1500", a: "300" }, carg: [{ cd: "3", nv: "1", agr: [{ n: "13", par: [{ sg: "PT", cand: [{ n: "13", sqcand: "1", nm: "A", vap: "600" }, { n: "22", sqcand: "2", nm: "B", vap: "250" }] }] }] }] };
  const d = normalizar(json);
  assert.equal(d.votosValidos, 850);
  assert.equal(d.candidatos.reduce((s, c) => s + c.pct, 0).toFixed(2), "100.00");
  assert.equal(d.candidatos[0].pct.toFixed(2), "70.59");
  assert.equal(d.brancos, 150); assert.equal(d.nulos, 100); // não voto continua à parte
});

test("regra de votos válidos em eleição proporcional: candidatos mais legendas", () => {
  const json = { v: { vvc: "9999", vb: "500", tvn: "400" }, carg: [{ cd: "6", nv: "2", agr: [{ n: "13", tvtl: "100", tvtn: "700", par: [{ sg: "PT", cand: [{ n: "1301", sqcand: "1", nm: "A", vap: "500" }, { n: "1302", sqcand: "2", nm: "B", vap: "200" }] }] }, { n: "22", tvtl: "50", tvtn: "150", par: [{ sg: "PL", cand: [{ n: "2201", sqcand: "3", nm: "C", vap: "150" }] }] }] }] };
  const d = normalizar(json);
  assert.equal(d.votosValidos, 1000); // 500 + 200 + 150 + legendas 100 + 50
});
