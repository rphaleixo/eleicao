globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { mapaBrasil, legendaMapa, contarLideres } = await import("../public/mapa.js");
const { ESTADOS } = await import("../public/mapa-brasil.js");
const { UFS } = await import("../public/config.js");

test("a malha tem os 27 estados, com caminho e centro", () => {
  assert.deepEqual(Object.keys(ESTADOS).sort(), Object.keys(UFS).sort());
  for (const { d, c } of Object.values(ESTADOS)) assert.ok(d.startsWith("M") && d.length > 20 && c.length === 2);
});

test("mapa colore cada estado com a cor de quem lidera e destaca o selecionado", () => {
  const lideres = { RJ: { cor: "#d00", quem: "LULA" }, SP: { cor: "#00d", quem: "FLAVIO" }, AC: null };
  const h = mapaBrasil(lideres, { selecionado: "SP" });
  assert.equal((h.match(/data-mapa-uf=/g) || []).length, 27);
  assert.ok(h.includes('data-mapa-uf="RJ"') && h.includes("fill:#d00") && h.includes("fill:#00d"));
  assert.ok(/class="mapa-uf sel" data-mapa-uf="SP"/.test(h));
  assert.ok(h.includes("LULA na frente") && h.includes("sem votos apurados"));
});

test("estados fora do filtro de região ficam apagados", () => {
  const h = mapaBrasil({}, { destaque: new Set(["RS", "SC", "PR"]) });
  assert.equal((h.match(/mapa-uf apagado/g) || []).length, 24);
});

test("legenda conta em quantos estados cada líder está na frente", () => {
  const itens = contarLideres({ RJ: { cor: "#d00", quem: "LULA" }, BA: { cor: "#d00", quem: "LULA" }, SP: { cor: "#00d", quem: "FLAVIO" }, AC: null });
  assert.deepEqual(itens.map((i) => [i.quem, i.n]), [["LULA", 2], ["FLAVIO", 1]]);
  const h = legendaMapa(itens);
  assert.ok(h.indexOf("LULA") < h.indexOf("FLAVIO") && h.includes("2 estados") && h.includes("1 estado<"));
  assert.ok(legendaMapa([]).includes("Nenhum estado"));
});
