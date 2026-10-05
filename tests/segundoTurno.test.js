import { test } from "node:test";
import assert from "node:assert/strict";
import { DISPUTAS_SEGUNDO_TURNO, UFS_GOVERNO_SEGUNDO_TURNO } from "../public/segundo-turno.js";
import { blocoDisputas, hrefDisputa, tituloDisputa } from "../public/segundoTurno.js";
import { contextoDoTurno } from "../worker/index.js";
import { alvosDoTurno } from "../worker/eventos.js";
import { normalizar } from "../public/tse.js";
import { UFS_GOV, TURNO2, ABAS } from "../public/config.js";

test("disputas do 2º turno: Presidente e sete governos, cada um com dois candidatos", () => {
  assert.equal(DISPUTAS_SEGUNDO_TURNO.length, 8);
  assert.deepEqual([...UFS_GOVERNO_SEGUNDO_TURNO].sort(), ["AC", "AM", "DF", "ES", "RJ", "RN", "TO"]);
  for (const d of DISPUTAS_SEGUNDO_TURNO) { assert.equal(d.candidatos.length, 2); assert.ok(d.candidatos.every((c) => c.id && c.nome && c.partido && c.pct > 0)); }
  assert.equal(DISPUTAS_SEGUNDO_TURNO[0].cargo, "presidente");
});

test("cards das disputas: nomes, resultado do 1º turno e link", () => {
  const h = blocoDisputas();
  assert.ok(h.includes("Disputas do 2º turno") && h.includes("FLAVIO BOLSONARO") && h.includes("LULA") && h.includes("25/10/2026"));
  assert.ok(h.includes('href="#/presidente"') && h.includes('href="#/estados/RJ/governador"') && h.includes("Governo · Rio de Janeiro"));
  const so = blocoDisputas("governador");
  assert.ok(!so.includes("Presidente da República") && so.includes("Governo ·"));
  assert.equal(blocoDisputas("senador"), "");
  assert.equal(hrefDisputa({ cargo: "governador", uf: "ES" }), "#/estados/ES/governador"); assert.equal(tituloDisputa({ cargo: "presidente" }), "Presidente da República");
});

test("turno: 2º a partir de 25/10 (ou pedido), arquivos, chaves e alvos próprios", () => {
  assert.equal(contextoDoTurno(null, Date.parse("2026-10-24T23:59:00-03:00")).turno, 1);
  const t2 = contextoDoTurno(null, Date.parse("2026-10-25T00:01:00-03:00"));
  assert.equal(t2.turno, 2); assert.equal(t2.federal, "6258"); assert.equal(t2.estadual, "6260"); assert.equal(t2.sufixo, "-t2");
  assert.equal(contextoDoTurno("2", 0).turno, 2); assert.equal(contextoDoTurno("1", Date.parse("2026-11-01T00:00:00-03:00")).turno, 1);
  assert.equal(t2.inicio, Date.parse("2026-10-25T17:00:00-03:00") / 1000);
  const alvos = alvosDoTurno(2);
  assert.equal(alvos.length, 8); assert.ok(alvos.every((a) => a.cargo === "presidente" || a.cargo === "governador")); assert.equal(alvosDoTurno(1).length, 55);
});

test("no 1º turno o site segue completo (todas as abas e estados)", () => {
  assert.equal(TURNO2, false); assert.equal(UFS_GOV.length, 27); assert.equal(ABAS.length, 7);
});

test("arquivo do 2º turno não marca '2º turno' de novo", () => {
  const json = { t: "2", carg: [{ cd: "3", nv: "1", agr: [{ par: [{ sg: "PL", cand: [{ sqcand: "1", nmu: "A", vap: "60", dvt: "Válido", e: "s", st: "Eleito" }] }, { sg: "PT", cand: [{ sqcand: "2", nmu: "B", vap: "40", dvt: "Válido", e: "n", st: "Não eleito" }] }] }] }], v: { vv: "100", vvc: "100" }, s: {}, e: {} };
  const d = normalizar(json);
  assert.equal(d.candidatos[0].sit, "eleito"); assert.equal(d.candidatos[1].sit, "");
});
