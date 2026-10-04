globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { plenarioCamara, porPartidoCamara, cardsEstadosCamara, tabelaEstadosCamara, lideresCamara, seletorAgrupCamara, MAIORIA_CAMARA } = await import("../public/camara.js");

const n = {
  total: 8, totalVagas: 10, confirmadasTotal: 4,
  partidos: [
    { sigla: "PL", vagas: 5, confirmadas: 3, votos: 5000, porUF: { SP: 3, RJ: 2 } },
    { sigla: "PT / PC do B / PV", vagas: 3, confirmadas: 1, votos: 3000, porUF: { SP: 1, RJ: 1, BA: 1 } },
  ],
  ufs: [
    { uf: "SP", vagas: 5, pct: 100, oficial: true, final: true, bancadas: [{ sigla: "PL", vagas: 3 }, { sigla: "PT / PC do B / PV", vagas: 1 }, { sigla: "PSD", vagas: 1 }] },
    { uf: "RJ", vagas: 3, pct: 40.5, oficial: false, final: false, bancadas: [{ sigla: "PL", vagas: 2 }, { sigla: "PT / PC do B / PV", vagas: 1 }] },
    { uf: "BA", vagas: 2, pct: 10, oficial: false, final: false, bancadas: [{ sigla: "PT / PC do B / PV", vagas: 1 }] },
  ],
};

test("plenário: um quadrado por cadeira e vagas sem projeção tracejadas", () => {
  const h = plenarioCamara(n);
  assert.equal((h.match(/<i /g) || []).length, 10);
  assert.equal((h.match(/pl-vaga/g) || []).length, 2);
  assert.ok(h.includes("8 de 10 cadeiras projetadas"));
  assert.equal(MAIORIA_CAMARA, 257);
});

test("por partido: total, % da Câmara, confirmadas, votos e maiores bancadas", () => {
  const h = porPartidoCamara(n);
  for (const t of ["PL", "<strong>5</strong>", "50,00%", "3 confirmadas", "5.000 votos", "maiores: SP 3 · RJ 2", "1 confirmada ·", "Em projeção"]) assert.ok(h.includes(t), t);
  assert.ok(h.indexOf("PL") < h.indexOf("PT / PC do B / PV"));
});

test("cards por estado: cadeiras, situação, apuração e bancada", () => {
  const h = cardsEstadosCamara(n, ["SP", "RJ"]);
  assert.equal((h.match(/class="card-uf card-camara/g) || []).length, 2);
  assert.ok(h.includes('data-uf="SP"') && h.includes("oficial") && h.includes("100,00%") && h.includes("40,50%") && h.includes("projeção"));
  assert.ok(h.includes("PL 3") && h.includes("PSD 1") && h.includes("<strong>5</strong> de 5 cadeiras"));
  assert.ok(!h.includes('data-uf="BA"'));
  assert.ok(h.includes("eleicao-eleito")); // só o estado oficial ganha o destaque verde
  assert.equal((h.match(/eleicao-eleito/g) || []).length, 1);
});

test("tabela por estado mantém as colunas de antes e respeita a lista de estados", () => {
  const h = tabelaEstadosCamara(n, ["BA"]);
  for (const t of ["Estado", "Vagas", "Apurado", "Situação", "Cadeiras por partido/federação", "Bahia", "10,00%", "projeção"]) assert.ok(h.includes(t), t);
  assert.ok(!h.includes("São Paulo"));
  assert.ok(tabelaEstadosCamara(n, []).includes("Nenhum estado com esses filtros"));
});

test("mapa: cor do partido com a maior bancada e força pela apuração", () => {
  const l = lideresCamara(n);
  assert.deepEqual([l.SP.quem, l.SP.apurado], ["PL", 100]);
  assert.deepEqual([l.BA.quem, l.BA.apurado], ["PT / PC do B / PV", 10]);
  assert.equal(lideresCamara({ ufs: [{ uf: "AC", bancadas: [], pct: 0 }] }).AC, null);
});

test("seletor de visões", () => {
  const h = seletorAgrupCamara("mapa");
  for (const k of ["partido", "estado", "mapa", "tabela"]) assert.ok(h.includes(`data-agrup-camara="${k}"`), k);
  assert.ok(h.includes('data-agrup-camara="mapa" aria-pressed="true"'));
});
