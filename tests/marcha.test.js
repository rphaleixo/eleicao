import fs0 from "node:fs";
const require_fs = () => fs0;
globalThis.location = { search: "?turno=1" }; // fixa o 1º turno: sem isso o resultado dos testes mudaria com a data
const test = (await import("node:test")).default;
const assert = (await import("node:assert/strict")).default;
const { agregar, REGIOES, telaMarcha, ufsVisiveis } = await import("../public/marcha.js");
const { UFS } = await import("../public/config.js");
const { setBase } = await import("../public/base.js");
setBase("totais"); // estes testes olham brancos e nulos, que só existem na base Eleitores aptos

const ufs = Object.fromEntries(Object.keys(UFS).map((u) => [u.toLowerCase(), { pct: 50, ts: 10, st: 5, andamento: "p", eleitores: 100, comparecimento: 40, abstencao: 10, dt: "", ht: "" }]));
ufs.br = { ...ufs.ac, ts: 270, st: 135 };
const ufsF = { ...ufs, zz: { pct: 10, ts: 5, st: 1, andamento: "p", eleitores: 50, comparecimento: 5, abstencao: 5, dt: "", ht: "" } };
const v = { f: { ufs: ufsF }, e: { ufs }, h: [], detalhe: { pres: null, gov: null, sen: null } };
const est = (o) => ({ uf: "BR", regiao: "", ordem: "az", ...o });

test("regiões cobrem os 27 estados, sem repetição", () => {
  const todas = Object.values(REGIOES).flatMap((r) => r.ufs);
  assert.equal(todas.length, 27);
  assert.deepEqual([...new Set(todas)].sort(), Object.keys(UFS).sort());
});

test("agregar soma seções e calcula percentuais", () => {
  const a = agregar([{ ts: 100, st: 50, eleitores: 1000, comparecimento: 400, abstencao: 100 }, { ts: 100, st: 100, eleitores: 1000, comparecimento: 300, abstencao: 200 }, undefined]);
  assert.equal(a.pct, 75);
  assert.equal(a.comparecimento, 700);
  assert.equal(Math.round(a.pctAbst), 30);
});

const detalhe = {
  pres: { candidatos: Array.from({ length: 7 }, (_, i) => ({ id: String(i), nome: "Cand " + i, partido: "P" + i, votos: 100 - i, pct: 10 - i })), votosValidos: 900, brancos: 60, nulos: 40, pctSecoes: 50, divulgaVotos: true },
  gov: null, sen: undefined,
};

test("exterior (ZZ) é um estado da lista", () => {
  assert.equal(ufsVisiveis("").length, 28);
  assert.deepEqual(ufsVisiveis("exterior"), ["ZZ"]);
  assert.ok(!ufsVisiveis("sul").includes("ZZ"));
});

test("tela do Brasil: painel único e lista de estados, sem seletor de eleição", () => {
  const h = telaMarcha(v, est({}));
  for (const t of ["Brasil", "Norte", "Acre", "Tocantins", "Exterior", 'data-uf="ZZ"', "anel", "Presentes", "Ausentes", "A apurar"]) assert.ok(h.includes(t), t);
  assert.ok(!h.includes("data-serie"));
  assert.equal((h.match(/class="card/g) || []).length, 3); // painel (Placar), estados e definições (a lista Regiões ficou dentro do cartão Estados)
  assert.ok(!h.includes("expandido"));
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("Santa Catarina") && !sul.includes("Acre") && !sul.includes('data-uf="ZZ"'));
});

test("ordenar por % apurado", () => {
  const uf2 = { ...ufsF, sp: { ...ufsF.sp, pct: 99, st: 10, ts: 10 } };
  const h = telaMarcha({ ...v, f: { ufs: uf2 } }, est({ ordem: "pct" }));
  assert.ok(h.indexOf('data-uf="SP"') < h.indexOf('data-uf="AC"'));
});

test("estado aberto: resumo, gráfico e carrossel com top 5 e votos brancos/nulos/válidos", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "RJ", visaoUfs: "lista" }));
  assert.ok(h.includes('aria-expanded="true"') && h.includes("expandido") && h.includes("el-cargos"));
  assert.ok(h.includes("Eleitores aptos") && h.includes("Abstenções"));
  assert.ok(!h.includes("exp-grafico")); // sem gráfico de evolução dentro do estado
  assert.equal((h.match(/data-sq=/g) || []).length, 5); // só os 5 primeiros do Presidente
  assert.ok(h.includes("Válidos") && h.includes("Brancos") && h.includes("Nulos"));
  assert.ok(h.includes("el-cargo--vazio") && h.includes("Aguardando") && h.includes("Ainda sem votos apurados neste estado.") && h.includes("Carregando") && !h.includes("Dados indisponíveis")); // Governador falhou, Senador ainda carregando
  assert.ok(/<small>[\d.]+ votos<\/small>|\d votos<\/small>/.test(h) && !h.includes("overflow-wrap: anywhere")); // o número pequeno diz que são votos
  assert.equal((h.match(/aria-expanded="true"/g) || []).length, 1);
});

test("exterior aberto mostra só o Presidente", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "ZZ" }));
  assert.ok(h.includes("expandido") && h.includes('data-ir="presidente"') && !h.includes('data-ir="governador"') && !h.includes('data-ir="senador"'));
});

test("cargo com candidatos mas sem votos vira cartão vazio de uma linha, não uma lista de zeros", () => {
  const nomes = ["Zeca", "Ana", "Mário", "Bia", "Carlos", "Débora", "Ênio"];
  const d0 = { candidatos: nomes.map((n, i) => ({ id: String(i), nome: n, partido: "P", votos: 0, pct: 0 })), votosValidos: 0, brancos: 0, nulos: 0, pctSecoes: 0, divulgaVotos: false };
  const h = telaMarcha({ ...v, detalhe: { pres: d0, gov: null, sen: null } }, est({ uf: "RJ" }));
  assert.ok(h.includes("el-cargo--vazio") && !h.includes("Zeca"));
});

test("válidos, brancos e nulos mostram total e percentual", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "RJ" }));
  assert.ok(h.includes("<strong>900</strong><small>90,00%</small>") && h.includes("<strong>60</strong><small>6,00%</small>") && h.includes("<strong>40</strong><small>4,00%</small>"));
});

test("cada estado mostra presentes, ausentes e a apurar, que somam 100%", () => {
  const h = telaMarcha(v, est({ visaoUfs: "lista" }));
  assert.ok(h.includes("Presentes <b>40,00%</b>") && h.includes("Ausentes <b>10,00%</b>") && h.includes("A apurar <b>50,00%</b>"));
});

test("navegação: segunda linha com 'Região inteira' e os estados da região escolhida", () => {
  const brasil = telaMarcha(v, est({}));
  assert.ok(!brasil.includes("Região inteira") && brasil.includes('data-regiao="sul"'));
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("data-regiao-inteira") && sul.includes('data-nav-uf="RS"') && sul.includes('data-nav-uf="PR"') && !sul.includes('data-nav-uf="SP"'));
  assert.ok(sul.includes('data-regiao-inteira aria-pressed="true"'));
  const rs = telaMarcha(v, est({ regiao: "sul", uf: "RS" }));
  assert.ok(rs.includes('data-nav-uf="RS" aria-pressed="true"') && rs.includes('data-regiao-inteira aria-pressed="false"') && rs.includes("expandido"));
});

test("o painel acompanha a região escolhida", () => {
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("<h2>Sul</h2>") && sul.includes("Região · 3 estados") && sul.includes("<strong>15</strong> de 30 seções"));
  const ext = telaMarcha(v, est({ regiao: "exterior" }));
  assert.ok(ext.includes("<h2>Exterior</h2>") && ext.includes("<strong>1</strong> de 5 seções") && !ext.includes("data-nav-uf"));
});

test("o Placar fica só com o resumo do Brasil; a lista por região vai para a coluna principal, recolhida", () => {
  const h = telaMarcha(v, est({ visaoUfs: "lista" }));
  const hero = h.slice(h.indexOf('class="card hero"'), h.indexOf("</section>", h.indexOf('class="card hero"')));
  assert.ok(hero.includes("anel") && !hero.includes("barras-regiao") && !hero.includes('data-painel='));
  assert.ok(!h.includes("apuracao-regioes") && !h.includes("barras-regiao")); // o painel foi para a lista Regiões
  const reg = telaMarcha(v, est({ agrupUfs: "regioes" }));
  for (const t of ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Exterior", "50,00%"]) assert.ok(reg.includes(t), t);
  const sul = telaMarcha(v, est({ regiao: "sul" }));
  assert.ok(sul.includes("Santa Catarina"));
});

test("blocos de estados: percentual sempre com duas casas, sem arredondar para inteiro", () => {
  const h = telaMarcha(v, est({}));
  assert.ok(/<small>\d{1,3},\d{2}%<\/small>/.test(h) && !/<small>\d{1,3}%<\/small>/.test(h));
  const fs = require_fs();
  for (const f of ["marcha.js", "cardsEstados.js", "graficos.js", "comparacaoView.js", "geoView.js", "partidos.js", "proporcional.js"]) {
    const src = fs.readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8");
    assert.ok(!/(Math\.(round|floor|trunc)\([^)]*\)|\.toFixed\(0\))\s*\}?%/.test(src), `${f} formata percentual sem casas`);
  }
});

test("a Marcha mostra os eleitores aptos junto das seções (painel, barras por região e lista)", () => {
  const geral = telaMarcha(v, est({ visaoUfs: "lista" }));
  assert.ok(geral.includes("eleitores aptos") && geral.includes("de 270 seções"));
  assert.match(geral, /de 10 seções · ([\d.]+ votos apurados \| )?([\d.]+ ausentes \| )?100 eleitores aptos/); // linha de um estado
  const reg = telaMarcha(v, est({ agrupUfs: "regioes" }));
  assert.ok(/\d de \d+ seções · /.test(reg) && reg.includes("eleitores aptos")); // a lista Regiões traz seções e aptos
});

test("estados em blocos (visão padrão): sigla, % apurado e o estado aberto com o resumo abaixo da grade", () => {
  const h = telaMarcha({ ...v, detalhe }, est({ uf: "RJ" }));
  assert.ok(h.includes('class="el-blocos"') && h.includes('aria-pressed="true"') && h.includes("bloco-aberto") && h.includes("el-cargos"));
  assert.ok(telaMarcha(v, est({ visaoUfs: "lista" })).includes("el-ufs"));
});

test("estados em mapa de blocos: grade 9×7, posição de cada sigla, percentual com duas casas e três botões de visão", () => {
  const h = telaMarcha(v, est({ visaoUfs: "mapa" }));
  assert.ok(h.includes('class="el-blocos el-blocos--mapa"') && h.includes('data-visao-ufs="mapa" aria-pressed="true"'));
  for (const [uf, pos] of [["RR", "1/4"], ["AC", "3/2"], ["RS", "7/4"], ["DF", "4/6"]]) assert.ok(new RegExp(`style="grid-area:${pos};[^"]*"[^>]*data-uf="${uf}"`).test(h), uf);
  assert.ok(h.includes("50,00%") && !h.includes('data-ordem="az"'));
  assert.ok(!telaMarcha(v, est({ visaoUfs: "blocos" })).includes("el-blocos--mapa"));
});

test("agrupamento Regiões: seis linhas el-uf--regiao, % somando seções (não a média dos estados), sem o seletor de visão; Estados em lista usa button.el-uf", () => {
  const h = telaMarcha(v, est({ agrupUfs: "regioes" }));
  assert.equal((h.match(/el-uf--regiao/g) ?? []).length, 6 + 0 * 1);
  for (const d of ["7 estados", "9 estados", "3 estados e DF", "4 estados", "3 estados", "1 local"]) assert.ok(h.includes(d), d);
  assert.ok(h.includes('data-agrup-ufs="regioes" aria-pressed="true"') && !h.includes("data-visao-ufs") && h.includes('data-regiao="sul"'));
  const lista = telaMarcha(v, est({ visaoUfs: "lista" }));
  assert.ok(lista.includes("el-ufs--duas") && lista.includes("el-uf--compacta") && lista.includes('data-agrup-ufs="estados" aria-pressed="true"'));
});

test("ordem padrão na Apuração: % apurado, igual nos dois agrupamentos, com o botão certo pressionado", () => {
  for (const agrupUfs of ["estados", "regioes"]) {
    const h = telaMarcha(v, est({ agrupUfs, visaoUfs: "lista" }));
    assert.ok(h.includes('data-ordem="pct" aria-pressed="true"') && h.includes('data-ordem="az" aria-pressed="false"'), agrupUfs);
    const az = telaMarcha(v, est({ agrupUfs, visaoUfs: "lista", ordem: "az", ordemEscolhida: true }));
    assert.ok(az.includes('data-ordem="az" aria-pressed="true"'), agrupUfs);
  }
});
