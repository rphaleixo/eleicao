import { test } from "node:test";
import assert from "node:assert/strict";
import { DISPUTAS_SEGUNDO_TURNO, UFS_GOVERNO_SEGUNDO_TURNO } from "../public/segundo-turno.js";
import { blocoDisputas, hrefDisputa, tituloDisputa } from "../public/segundoTurno.js";
import { contextoDoTurno } from "../worker/index.js";
import { alvosDoTurno } from "../worker/eventos.js";
import { normalizar } from "../public/tse.js";
import { UFS_GOV, TURNO2, ABAS } from "../public/config.js";

test("disputas do 2º turno: Presidente e seis governos, cada um com dois candidatos", () => {
  assert.equal(DISPUTAS_SEGUNDO_TURNO.length, 7);
  assert.deepEqual([...UFS_GOVERNO_SEGUNDO_TURNO].sort(), ["AC", "AM", "DF", "ES", "RN", "TO"]);
  for (const d of DISPUTAS_SEGUNDO_TURNO) { assert.equal(d.candidatos.length, 2); assert.ok(d.candidatos.every((c) => c.id && c.nome && c.partido && c.pct > 0)); }
  assert.equal(DISPUTAS_SEGUNDO_TURNO[0].cargo, "presidente");
});

test("cards das disputas: nomes, resultado do 1º turno e link", () => {
  const h = blocoDisputas();
  assert.ok(h.includes("Disputas do 2º turno") && h.includes("FLAVIO BOLSONARO") && h.includes("LULA") && h.includes("25/10/2026"));
  assert.ok(h.includes('href="#/presidente"') && h.includes('href="#/estados/DF/governador"') && h.includes("Governo · Distrito Federal"));
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
  assert.equal(t2.inicio, Date.parse("2026-10-25T00:00:00-03:00") / 1000); // só o começo do dia: nenhum horário de divulgação no código
  const alvos = alvosDoTurno(2);
  assert.equal(alvos.length, 7); assert.ok(alvos.every((a) => a.cargo === "presidente" || a.cargo === "governador")); assert.equal(alvosDoTurno(1).length, 55);
});

test("no 1º turno o site segue completo (todas as abas e estados)", () => {
  assert.equal(TURNO2, false); assert.equal(UFS_GOV.length, 27); assert.equal(ABAS.length, 12); assert.equal(ABAS.filter((a) => a.id !== "turnos").length, 11); // onze áreas no menu (01 a 11); Comparar turnos fica fora do menu
});

test("arquivo do 2º turno não marca '2º turno' de novo", () => {
  const json = { t: "2", carg: [{ cd: "3", nv: "1", agr: [{ par: [{ sg: "PL", cand: [{ sqcand: "1", nmu: "A", vap: "60", dvt: "Válido", e: "s", st: "Eleito" }] }, { sg: "PT", cand: [{ sqcand: "2", nmu: "B", vap: "40", dvt: "Válido", e: "n", st: "Não eleito" }] }] }] }], v: { vv: "100", vvc: "100" }, s: {}, e: {} };
  const d = normalizar(json);
  assert.equal(d.candidatos[0].sit, "eleito"); assert.equal(d.candidatos[1].sit, "");
});

test("disputa compacta (el-duplo): finalistas na mesma linha, sem votos absolutos; com 2º turno o número grande é o dele e o do 1º vai para o rodapé", async () => {
  const { duplo } = await import("../public/segundoTurno.js");
  const d = DISPUTAS_SEGUNDO_TURNO[0];
  const h1 = duplo(d, null);
  assert.ok(h1.includes("el-duplo__corpo") && h1.includes("47,03%") && h1.includes("Resultado do 1º turno") && h1.includes("Ver apuração"));
  assert.ok(!/votos<\/small>|\d\.\d{3}\.\d{3} votos/.test(h1) && !h1.includes("el-duplo__votos"));
  const d2 = { pctSecoes: 0.25, candidatos: [{ numero: "13", pct: 57.66 }, { numero: "22", pct: 42.34 }] };
  const h2 = duplo(d, d2);
  assert.ok(h2.includes("42,34%") && h2.includes("57,66%") && h2.includes("1º turno: 45,16% × 47,03%") && h2.includes("2º turno: 0,25% das seções"));
  assert.ok(!h2.includes("Resultado do 1º turno ·"));
  // Lula sempre à esquerda e Flávio à direita, mesmo com Flávio na frente; barra de dois lados com a marca de 50% uma vez; sem o "×"
  assert.ok(h1.indexOf("LULA") < h1.indexOf("FLAVIO BOLSONARO") && h2.indexOf("LULA") < h2.indexOf("FLAVIO BOLSONARO"));
  assert.ok(h2.includes("el-duplo__barra") && h2.includes("el-composicao--meta") && h2.split("el-composicao__rotulo50").length === 2 && !h2.includes("el-duplo__x"));
  assert.ok(/width:57\.66%[^>]*><\/i><i style="width:42\.34%/.test(h2));
  const h3 = duplo(DISPUTAS_SEGUNDO_TURNO.find((x) => x.cargo === "governador"), null);
  assert.ok(h3.includes("el-duplo__barra") && /width:[\d.]+%/.test(h3));
});
