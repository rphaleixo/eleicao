globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { mapaBrasil, legendaMapa, contarLideres, COR_SEGUNDO_TURNO, alfaApuracao } = await import("../public/mapa.js");
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

test("legenda com partidos, 2º turno e sem votos, nessa ordem", () => {
  const itens = contarLideres({ RJ: { cor: "#d00", quem: "PT" }, BA: { cor: "#d00", quem: "PT" }, SP: { cor: COR_SEGUNDO_TURNO, quem: "Segundo turno", segundo: true }, MG: { cor: "#00d", quem: "PL" } });
  const h = legendaMapa(itens, { semVotos: 3, nota: "regra" });
  assert.ok(h.indexOf("PT") < h.indexOf("PL") && h.indexOf("PL") < h.indexOf("2º turno") && h.indexOf("2º turno") < h.indexOf("Sem votos apurados"));
  assert.ok(h.includes("2 estados") && h.includes("3 estados") && h.includes("leg-segundo") && h.includes("regra"));
  assert.ok(legendaMapa([], { semVotos: 2 }).includes("Sem votos apurados"));
});

test("legenda do mapa por município fala em municípios", () => {
  const h = legendaMapa([{ cor: "#d00", quem: "ANA (PT)", n: 238 }], { semVotos: 1, unidade: ["município", "municípios"] });
  assert.ok(h.includes("238 municípios") && h.includes("1 município<") && !h.includes("estados"));
});

test("a força da cor acompanha a apuração, nos mapas de estado e de município", async () => {
  assert.equal(alfaApuracao(0), 0.22);
  assert.equal(alfaApuracao(100), 1);
  assert.equal(alfaApuracao(50), 0.61);
  assert.equal(alfaApuracao(250), 1); // limite
  assert.equal(alfaApuracao(undefined), 0.22);
  const h = mapaBrasil({ RJ: { cor: "#d00", quem: "LULA", apurado: 100 }, SP: { cor: "#00d", quem: "FLAVIO", apurado: 0 }, MG: { cor: "#0a0", quem: "X", apurado: 50 }, AC: null });
  assert.ok(h.includes("fill:#d00;fill-opacity:1") && h.includes("fill:#00d;fill-opacity:0.22") && h.includes("fill:#0a0;fill-opacity:0.61"));
  assert.ok(h.includes("100,00% apurado") && !/data-mapa-uf="AC"[^>]*fill-opacity/.test(h)); // sem votos: cor neutra, sem transparência
  const { mapaMunicipal } = await import("../public/mapa.js");
  const { lerMalha } = await import("../public/municipios.js");
  const m = lerMalha('<svg viewBox="0 0 1 1"><path id="1" d="M0,0Z" /><path id="2" d="M1,1Z" /></svg>');
  const hm = mapaMunicipal(m, new Map([["1", { cor: "#d00", quem: "ANA", apurado: 80 }]]), new Map([["1", "Uma"], ["2", "Duas"]]));
  assert.ok(hm.includes("fill:#d00;fill-opacity:0.84") && hm.includes("80,00% apurado"));
  assert.ok(legendaMapa([{ cor: "#d00", quem: "ANA", n: 1 }]).includes("escala-apuracao"));
});
