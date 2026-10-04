globalThis.location = { search: "" };
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { montarBancada, mapaFederacoes, plenario, telaBancada, chaveSigla } = await import("../public/bancada.js");

const cand = (id, nome, partido, votos, sit = "") => ({ id, nome, partido, votos, elegivel: true, sit });
const d = (cands, partidos = []) => ({ vagas: 2, candidatos: cands, partidos });
const fed = { sigla: "PT/PC do B/PV", federacao: true };
const mandatos = [
  { nome: "Ana", uf: "RJ", partido: "PT", participacao: "Titular", titular: null },
  { nome: "Bia", uf: "BA", partido: "PCdoB", participacao: "Titular", titular: null },
  { nome: "Cid", uf: "SP", partido: "PL", participacao: "1º Suplente", titular: "Dono" },
  { nome: "Rom", uf: "RJ", partido: "S/Partido", participacao: "Titular", titular: null },
];

test("chave de sigla ignora acento, caixa e pontuação", () => {
  assert.equal(chaveSigla("PC do B"), chaveSigla("PCdoB"));
  assert.equal(chaveSigla("UNIÃO"), chaveSigla("União"));
});

test("partidos de uma federação entram juntos, e os 2 mais votados de cada estado são os projetados", () => {
  const resultados = [
    { uf: "RJ", d: d([cand("1", "X", "PT", 500), cand("2", "Y", "PL", 400), cand("3", "Z", "PL", 100)], [fed]) },
    { uf: "AC", d: d([cand("4", "W", "PL", 0), cand("5", "V", "PT", 0)]) }, // sem votos: sem projeção
    { uf: "BA", d: null },
  ];
  assert.equal(mapaFederacoes(resultados.map((r) => r.d)).get("PCDOB"), "PT / PC do B / PV");
  const b = montarBancada({ mandatos, resultados });
  const fe = b.linhas.find((l) => l.rotulo === "PT / PC do B / PV");
  assert.deepEqual([fe.mantem, fe.eleitos, fe.total], [2, 1, 3]); // Ana (PT) + Bia (PCdoB) + X (PT)
  const pl = b.linhas.find((l) => l.rotulo === "PL");
  assert.deepEqual([pl.mantem, pl.eleitos], [1, 1]);
  assert.equal(b.linhas.find((l) => l.rotulo === "Sem partido").mantem, 1);
  assert.equal(b.totalMantem, 4);
  assert.equal(b.totalEleitos, 2);
  assert.equal(b.vagasPendentes, 52);
  assert.equal(b.linhas[0].rotulo, "PT / PC do B / PV"); // ordenado por total
});

test("plenário tem sempre 81 lugares e a tela mostra totais", () => {
  const b = montarBancada({ mandatos, resultados: [{ uf: "RJ", d: d([cand("1", "X", "PT", 500, "eleito"), cand("2", "Y", "PL", 400)], [fed]) }] });
  const p = plenario(b);
  assert.equal((p.match(/<i class="pl-/g) || []).length, 81);
  assert.equal((p.match(/pl-eleito/g) || []).length, 2);
  assert.equal((p.match(/pl-mantem/g) || []).length, 4);
  const h = telaBancada(b, { versao: "v1" });
  for (const t of ["Bancada do Senado em 2027", "Maioria absoluta: 41", "Mandato até 2031", "1 ✓", "Dono", "Sem partido"]) assert.ok(h.includes(t), t);
  assert.ok(telaBancada(b, { carregando: true }).includes("Carregando"));
});
