import test from "node:test";
import assert from "node:assert/strict";
const { painelLista, limiteDe, maisItens, verMais, zerarLimites } = await import("../public/lista.js");

test("lista longa: começa com 10, o botão acrescenta 10 e some quando já se vê tudo", () => {
  zerarLimites();
  assert.equal(limiteDe("x"), 10);
  const v = verMais("x", 10, 27);
  assert.ok(v.includes("Ver mais 10") && v.includes('data-vermais="x"') && v.includes("27"));
  maisItens("x"); assert.equal(limiteDe("x"), 20);
  maisItens("x"); assert.equal(limiteDe("x"), 30);
  assert.equal(verMais("x", 27, 27), "");
  assert.ok(verMais("x", 20, 27).includes("Ver mais 7"));
  assert.equal(limiteDe("cmp", 5), 5); maisItens("cmp", 10, 5); assert.equal(limiteDe("cmp", 5), 15);
});

test("painel recolhido por padrão, com o título e o resumo à vista", () => {
  const h = painelLista("p1", "Resultado por estado", "27 estados · ordem alfabética", "<p>corpo</p>");
  assert.ok(h.includes("<details") && !h.includes(" open") && h.includes("Resultado por estado") && h.includes("27 estados") && h.includes("<p>corpo</p>"));
});

test("emenda do eixo (votação prorrogada): o trecho sem apuração sai do eixo e os pontos de depois andam para trás", async () => {
  const { emendar } = await import("../public/graficos.js");
  const h = (hhmm) => Date.parse(`2026-10-25T${hhmm}:00-03:00`), fim = h("19:00");
  const pts = [{ t: h("17:00") }, { t: h("17:15") }, { t: h("19:00") }, { t: h("19:10") }];
  const kz = emendar(pts, h("19:20"), fim);
  assert.equal(kz.de, h("17:15"));
  assert.equal(pts[2].t, h("17:15")); // o primeiro ponto a partir das 19h cola no das 17h15
  assert.equal(pts[3].t - pts[2].t, 10 * 60000); // e o intervalo seguinte é o de verdade
  assert.equal(kz.ate, h("17:35"));
  assert.equal(emendar([{ t: h("17:00") }, { t: h("18:55") }, { t: h("19:00") }], 0, fim), null); // sem lacuna: nada a emendar
  assert.equal(emendar([{ t: h("17:00") }, { t: h("17:15") }, { t: h("19:00") }], 0, 0), null); // 1º turno: sem fim fixo
});

test("vantagem: votos e p.p. com sinal tipográfico, empate abaixo de 0,01 p.p.", async () => {
  const { vantagem, txtVotos, txtPP } = await import("../public/vantagem.js");
  const v = vantagem({ votos: 1000000, pct: 50.2 }, { votos: 953664, pct: 47.8 });
  assert.equal(v.votos, 46336); assert.equal(v.pp, 2.4); assert.equal(v.empate, false);
  assert.equal(txtVotos(v.votos), "+46.336"); assert.equal(txtPP(v.pp), "+2,40 p.p.");
  assert.equal(txtVotos(-46336), "−46.336"); assert.equal(txtPP(-0.4), "−0,40 p.p.");
  assert.equal(vantagem({ votos: 10, pct: 50.004 }, { votos: 5, pct: 50 }).empate, true);
  assert.equal(vantagem({ votos: 10, pct: 50 }, null), null);
});

test("pódio de dois finalistas: vantagem nas duas caixas; com mais de dois, só o 1º", async () => {
  const { rankingMajoritario } = await import("../public/ranking.js");
  const c = (id, nome, partido, votos, pct, numero) => ({ id, nome, partido, votos, pct, numero, elegivel: true, situacaoVoto: "" });
  const dois = { candidatos: [c("a", "FLAVIO BOLSONARO", "PL", 5000, 50.2, "22"), c("b", "LULA", "PT", 4954, 49.8, "13")], vagas: 1 };
  const h = rankingMajoritario(dois, { aba: "presidente", uf: "BR" });
  assert.equal((h.match(/el-pod__vantagem/g) || []).length, 3); // 2 blocos + 1 modificador --atras
  assert.ok(h.includes("+46 votos") && h.includes("+0,40 p.p. sobre LULA") && h.includes("−46 votos") && h.includes("−0,40 p.p. para FLAVIO BOLSONARO"));
  assert.ok(h.indexOf("LULA") < h.indexOf("FLAVIO BOLSONARO") && h.includes("el-pod__vantagem--atras")); // Lula à esquerda; 1º/2º vai por votos
  const tres = { candidatos: [...dois.candidatos, c("c", "OUTRO", "PSD", 100, 1, "55")], vagas: 1 };
  assert.equal((rankingMajoritario(tres, { aba: "presidente", uf: "BR" }).match(/<span class="el-pod__vantagem/g) || []).length, 1);
  const emp = { candidatos: [c("a", "A", "PL", 5000, 50.001, "22"), c("b", "B", "PT", 4990, 50, "13")], vagas: 1 };
  assert.equal((rankingMajoritario(emp, { aba: "governador", uf: "AC" }).match(/<b>Empate<\/b>/g) || []).length, 2);
});
