import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarEventos, acrescentarEventos, escolherAlvos, ALVOS, caminhoAlvo } from "../worker/eventos.js";
import { blocoEventos, textoEvento, ordenarEventos } from "../public/eventos.js";

const c = (id, nome, partido, sit = "") => ({ id, nome, partido, sit });

test("detecta eleito, 2º turno e senadores um a um", () => {
  assert.equal(detectarEventos("governador", "RJ", { candidatos: [c("1", "A", "PT", "eleito"), c("2", "B", "PL")] }).eventos[0].k, "governador:RJ:eleito");
  const seg = detectarEventos("governador", "SP", { candidatos: [c("1", "A", "PT", "segundo"), c("2", "B", "PL", "segundo")] });
  assert.equal(seg.eventos[0].tipo, "segundo"); assert.equal(seg.eventos[0].c.length, 2); assert.equal(seg.fechado, true);
  const um = detectarEventos("senador", "MG", { vagas: 2, candidatos: [c("1", "A", "PT", "eleito"), c("2", "B", "PL")] });
  assert.equal(um.eventos.length, 1); assert.equal(um.fechado, false);
  assert.equal(detectarEventos("senador", "MG", { vagas: 2, candidatos: [c("1", "A", "PT", "eleito"), c("2", "B", "PL", "eleito")] }).fechado, true);
  assert.equal(detectarEventos("governador", "AC", { candidatos: [c("1", "A", "PT")] }).eventos.length, 0);
});

test("só acrescenta o que é novo e marca a primeira visita", () => {
  const ev = [{ k: "x", cargo: "senador", uf: "MG", tipo: "eleito", c: [] }];
  const r1 = acrescentarEventos({ itens: [] }, ev, 1000000, true);
  assert.equal(r1.itens[0].t, 1000); assert.equal(r1.itens[0].a, 1);
  assert.equal(acrescentarEventos({ itens: r1.itens }, ev, 2000000).mudou, false);
});

test("revezamento: alvos fechados saem e os menos visitados vêm primeiro", () => {
  assert.equal(ALVOS.length, 55);
  const alvos = escolherAlvos({ visto: { "presidente:br": 5 }, fechado: { "governador:ac": 1 } }, 3);
  assert.equal(alvos.length, 3); assert.ok(!alvos.some((a) => a.id === "governador:ac" || a.id === "presidente:br"));
  assert.equal(caminhoAlvo(ALVOS[0], "2026", "6257", "6259"), "ele2026/6257/dados/br/br-c0001-e006257-u.json");
});

test("log: mais recentes primeiro, textos das definições", () => {
  const itens = [
    { k: "a", t: 100, cargo: "senador", uf: "MG", tipo: "eleito", c: [{ n: "FULANO", p: "PT", id: "1" }] },
    { k: "b", t: 200, cargo: "governador", uf: "SP", tipo: "segundo", c: [{ n: "BELTRANO", p: "PL", id: "2" }, { n: "CICLANO", p: "PSD", id: "3" }] },
  ];
  assert.deepEqual(ordenarEventos(itens).map((e) => e.k), ["b", "a"]);
  const html = blocoEventos({ itens });
  assert.ok(html.indexOf("BELTRANO") < html.indexOf("FULANO"));
  assert.match(textoEvento(itens[1]), /definição de 2º turno entre .*BELTRANO.* × .*CICLANO/);
  assert.match(textoEvento(itens[0]), /é eleito/);
  assert.match(blocoEventos({ itens: [] }), /Nenhuma definição ainda/);
  assert.match(blocoEventos(null), /Carregando/);
});
