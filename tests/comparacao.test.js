import { test } from "node:test";
import assert from "node:assert/strict";
import { linhaDeResultado, linhaDeArquivo, naoVoto, percentual, compararLinhas, valorDoMapa, categoriaLider, classesDoMapa, extremos } from "../public/comparacao.js";
import { quadroComparacao, barrasComposicao, tabelaExtremos } from "../public/comparacaoView.js";

const d1 = { eleitorado: { apuradas: 1000, comparecimento: 800, abstencao: 200 }, brancos: 20, nulos: 30, votosValidos: 750, pctSecoes: 100,
  candidatos: [{ numero: "13", votos: 350 }, { numero: "22", votos: 300 }, { numero: "15", votos: 60 }, { numero: "30", votos: 40 }] };
const d2 = { eleitorado: { apuradas: 1010, comparecimento: 860, abstencao: 150 }, brancos: 10, nulos: 20, votosValidos: 830, pctSecoes: 90,
  candidatos: [{ numero: "13", votos: 400 }, { numero: "22", votos: 430 }] };

test("linha do turno: Lula, Flávio, outros e não voto", () => {
  const l = linhaDeResultado(d1);
  assert.equal(l.lula, 350); assert.equal(l.flavio, 300); assert.equal(l.outros, 100);
  assert.equal(naoVoto(l), 250);
  assert.equal(l.lula + l.flavio + l.outros + naoVoto(l), l.aptos); // votos válidos + não voto = aptos neste exemplo
  assert.equal(linhaDeResultado(null), null);
});

test("linha do arquivo por município", () => {
  const l = linhaDeArquivo(["RJ", "3304557", 1000, 800, 200, 20, 30, 350, 300, 100, 750, 100]);
  assert.equal(l.lula, 350); assert.equal(l.aptos, 1000); assert.equal(l.validos, 750);
});

test("percentuais: sobre aptos ou sobre válidos (o não voto sempre sobre os aptos)", () => {
  const l = linhaDeResultado(d1);
  assert.equal(percentual(l, "lula", "aptos"), 35);
  assert.equal(percentual(l, "lula", "validos"), (350 / 750) * 100);
  assert.equal(percentual(l, "naovoto", "validos"), 25);
});

test("comparação: variação em votos e em pontos percentuais; outros somem no 2º turno", () => {
  const r = compararLinhas(linhaDeResultado(d1), linhaDeResultado(d2), "aptos");
  const lula = r.find((x) => x.chave === "lula"), outros = r.find((x) => x.chave === "outros"), nv = r.find((x) => x.chave === "naovoto");
  assert.equal(lula.dv, 50); assert.ok(Math.abs(lula.dp - (400 / 1010 * 100 - 35)) < 1e-9);
  assert.equal(outros.v2, 0); assert.equal(outros.semNoTurno2, true); assert.equal(outros.dv, -100);
  assert.equal(nv.v1, 250); assert.equal(nv.v2, 180); assert.equal(nv.dv, -70);
  const sem = compararLinhas(linhaDeResultado(d1), null);
  assert.equal(sem[0].dv, null); assert.equal(sem[0].v2, null);
});

test("mapa: valores por medida e categoria de quem liderou", () => {
  const a = linhaDeResultado(d1), b = linhaDeResultado(d2);
  assert.equal(valorDoMapa(a, b, { linha: "lula", medida: "votos", base: "aptos" }), 50);
  assert.ok(Math.abs(valorDoMapa(a, b, { linha: "flavio", medida: "pp", base: "aptos" }) - (430 / 1010 * 100 - 30)) < 1e-9);
  assert.equal(valorDoMapa(a, null, { linha: "lula", medida: "pp", base: "aptos" }), null);
  assert.equal(valorDoMapa(a, null, { linha: "lula", medida: "p1", base: "aptos" }), 35);
  assert.equal(categoriaLider(a, b), 2); // Lula liderava no 1º turno e Flávio no 2º: virou para Flávio
  assert.equal(categoriaLider(b, a), 3);
  assert.equal(categoriaLider(a, null), null);
});

test("classes de cor da variação e maiores altas e quedas", () => {
  const cls = classesDoMapa([-5, -3, -0.01, 0.02, 3, 6], "pp");
  assert.equal(cls.classe(-5), 0); assert.equal(cls.classe(6), 4); assert.equal(cls.classe(0), 2);
  const it = [{ nome: "A", valor: 1 }, { nome: "B", valor: -4 }, { nome: "C", valor: 9 }, { nome: "D", valor: null }];
  assert.deepEqual(extremos(it, "alta", 2).map((i) => i.nome), ["C", "A"]);
  assert.deepEqual(extremos(it, "queda", 1).map((i) => i.nome), ["B"]);
});

test("quadro e barras mostram as quatro linhas, os dois turnos e a variação", () => {
  const html = quadroComparacao(linhaDeResultado(d1), linhaDeResultado(d2), { base: "aptos", ondeNome: "Brasil", status2: "" });
  for (const t of ["el-duelo", "Lula", "Flávio Bolsonaro", "Outros candidatos", "Não voto", "lidera", "2º turno menos 1º turno"]) assert.ok(html.includes(t), t);
  assert.equal((barrasComposicao(linhaDeResultado(d1), null).match(/sem dados ainda/g) || []).length, 1);
  assert.match(tabelaExtremos([{ ibge: "1", nome: "X", uf: "RJ", l1: { aptos: 10 }, valor: 1.234 }], { medida: "pp", dir: "alta", linhaNome: "Lula" }), /\+1,23 pp/);
});

import { agruparPorPais, somarLinhas, linhaDeExterior, valorDeOrdem } from "../public/comparacao.js";
import { exteriorPorPais } from "../public/comparacaoView.js";
test("exterior por país: soma as cidades do mesmo país e ordena", () => {
  const l = (aptos, lula, flavio) => ({ aptos, comparecimento: 0, abstencao: aptos - lula - flavio, brancos: 0, nulos: 0, lula, flavio, outros: 0, validos: lula + flavio, pct: 100 });
  const t1 = new Map([["1", l(100, 30, 20)], ["2", l(50, 10, 10)], ["3", l(10, 5, 1)]]);
  const t2 = new Map([["1", l(100, 40, 20)], ["2", l(50, 15, 10)]]);
  const paises = { 1: ["LISBOA", "Portugal"], 2: ["PORTO", "Portugal"], 3: ["ROMA", "Itália"] };
  const g = agruparPorPais(t1, t2, paises);
  const pt = g.find((x) => x.pais === "Portugal"), it = g.find((x) => x.pais === "Itália");
  assert.equal(pt.l1.aptos, 150); assert.equal(pt.l2.lula, 55); assert.equal(pt.cidades.length, 2); assert.equal(pt.parcial2, false);
  assert.equal(it.l2, null);
  assert.ok(valorDeOrdem(pt, "aptos", "aptos") > valorDeOrdem(it, "aptos", "aptos"));
  assert.ok(valorDeOrdem(pt, "dp:lula", "aptos") > 0);
  const html = exteriorPorPais(g, { base: "aptos", ordem: "aptos", abertos: new Set(["Portugal"]), limite: 10 });
  assert.ok(html.includes("Portugal") && html.includes("LISBOA") && html.includes("PORTO") && !html.includes("ROMA <"));
  assert.equal(somarLinhas([null, null]), null);
  assert.equal(linhaDeExterior(["X", 10, 7, 3, 1, 1, 4, 3, 0, 7, 100]).lula, 4);
});

test("Duelo: sem dados no 2º turno a faixa descreve o 1º turno e as colunas mostram traço; com dados, mostra ampliou ou reduziu", () => {
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 20, nulos: 30, lula: 400, flavio: 300, outros: 50, validos: 750, pct: 100 };
  const sem = quadroComparacao(l1, null, { base: "validos", ondeNome: "Acre", status2: "" });
  assert.ok(sem.includes("lidera no 1º turno") && sem.includes("ainda sem dados") && sem.includes("el-duelo__sem"));
  assert.ok(!sem.includes("ampliou") && !sem.includes("reduziu"));
  const l2 = { ...l1, lula: 500, flavio: 250, outros: 0, validos: 750, pct: 100 };
  const com = quadroComparacao(l1, l2, { base: "validos", ondeNome: "Acre", status2: "" });
  assert.ok(com.includes("ampliou") && com.includes("+33,33 p.p.")); // (500−250)/750
  assert.ok(!com.includes(">Não voto<")); // na base de votos válidos o não voto não é linha
  assert.ok(quadroComparacao(l1, l2, { base: "aptos", ondeNome: "Acre", status2: "" }).includes("Não voto"));
});

test("poucas urnas (menos de 5%): aviso, 'na frente por enquanto', sem 'lidera' e variação parcial", () => {
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 20, nulos: 30, lula: 400, flavio: 300, outros: 50, validos: 750, pct: 100 };
  const l2 = { aptos: 10, comparecimento: 9, abstencao: 1, brancos: 0, nulos: 0, lula: 6, flavio: 3, outros: 0, validos: 9, pct: 0.25 };
  const h = quadroComparacao(l1, l2, { base: "validos", ondeNome: "Brasil", status2: "" });
  assert.ok(h.includes("Apenas 0,25% das urnas apuradas. Os números iniciais mudam bastante."));
  assert.ok(h.includes("na frente por enquanto") && !h.includes("lidera") && !h.includes("el-duelo__linha--lider"));
  assert.ok(h.includes("<small>parcial</small>") && h.includes("el-duelo__vantagem--inicial"));
  const depois = quadroComparacao(l1, { ...l2, pct: 40 }, { base: "validos", ondeNome: "Brasil", status2: "" });
  assert.ok(depois.includes("lidera") && !depois.includes("Apenas") && depois.includes("<small>parcial</small>")); // com 5% ou mais volta ao normal, ainda parcial
});

test("seletor de lugar: Brasil, Regiões (Norte… Sul e Exterior) e os 27 Estados, nesta ordem, em optgroup", async () => {
  const { opcoesDeLugar, regiaoDoValor } = await import("../public/lugares.js");
  const h = opcoesDeLugar({ selecionado: "r:nordeste" });
  const grupos = [...h.matchAll(/<optgroup label="([^"]+)">(.*?)<\/optgroup>/g)];
  assert.deepEqual(grupos.map((g) => g[1]), ["Brasil", "Regiões", "Estados"]);
  const nomes = (i) => [...grupos[i][2].matchAll(/>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.deepEqual(nomes(1), ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Exterior"]);
  assert.equal(nomes(2).length, 27);
  assert.deepEqual(nomes(2), [...nomes(2)].sort((a, b) => a.localeCompare(b, "pt-BR")));
  assert.ok(grupos[1][2].includes('<option value="r:nordeste" selected>'));
  assert.ok(!opcoesDeLugar({ selecionado: "", brasil: "", comExterior: false }).includes("Exterior"));
  assert.equal(regiaoDoValor("r:sul"), "sul"); assert.equal(regiaoDoValor("SP"), ""); assert.equal(regiaoDoValor("r:xx"), "");
});

test("Comparar turnos com região: o 'Onde' mostra o nome da região e o seletor de município some", async () => {
  const { controlesComparacao } = await import("../public/comparacaoView.js");
  const c = { uf: "BR", mun: "", regiao: "nordeste", base: "validos", linha: "lula", medida: "pp", premissas: true };
  const h = controlesComparacao(c, { municipios: [] });
  assert.ok(h.includes("Nordeste") && h.includes('<option value="r:nordeste" selected>') && !h.includes("data-ct-mun"));
});

test("Não voto em três partes: a soma de abstenções, brancos e nulos é a linha Não voto, em votos e em %", async () => {
  const { parteNaoVoto, quadroComparacao, PARTES_NAO_VOTO } = await import("../public/comparacaoView.js");
  const { naoVoto, percentual } = await import("../public/comparacao.js");
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 400, flavio: 300, outros: 20, validos: 720, pct: 100 };
  const l2 = { aptos: 900, comparecimento: 780, abstencao: 120, brancos: 25, nulos: 35, lula: 380, flavio: 340, outros: 0, validos: 720, pct: 60 };
  for (const l of [l1, l2]) {
    const partes = PARTES_NAO_VOTO.map(([k]) => parteNaoVoto(l, k));
    assert.equal(partes.reduce((t, x) => t + x.v, 0), naoVoto(l));
    assert.ok(Math.abs(partes.reduce((t, x) => t + x.p, 0) - percentual(l, "naovoto", "aptos")) < 1e-9);
  }
  const h = quadroComparacao(l1, l2, { base: "aptos", ondeNome: "Brasil", status2: "" });
  assert.ok(h.includes('class="el-detalhe-btn"') && h.includes('aria-expanded="false"') && (h.match(/class="el-duelo__linha el-subtotal"[^>]* hidden/g) || []).length === 3); // fechado por padrão
  for (const n of ["Abstenções", "Brancos", "Nulos"]) assert.ok(h.includes(n));
  assert.ok(/el-subtotal__marca--abstencao/.test(h) && /el-subtotal__marca--brancos/.test(h) && /el-subtotal__marca--nulos/.test(h));
  assert.ok(quadroComparacao(l1, l2, { base: "aptos", ondeNome: "Brasil", status2: "", nvAberto: true }).includes('aria-expanded="true"'));
  const v = quadroComparacao(l1, l2, { base: "validos", ondeNome: "Brasil", status2: "" });
  assert.ok(!v.includes("el-subtotal") && !v.includes("el-detalhe-btn") && !v.includes("Não voto")); // base Votos válidos: nada muda
});

test("Não voto em três partes: sem a separação no 2º turno a coluna mostra — (nunca zero)", async () => {
  const { parteNaoVoto, quadroComparacao } = await import("../public/comparacaoView.js");
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 400, flavio: 300, outros: 20, validos: 720, pct: 100 };
  const sem = { aptos: 900, comparecimento: 0, abstencao: 0, brancos: 0, nulos: 0, lula: 380, flavio: 340, outros: 0, validos: 720, pct: 60 };
  assert.equal(parteNaoVoto(sem, "nulos"), null);
  assert.equal(parteNaoVoto(null, "nulos"), null);
  const h = quadroComparacao(l1, sem, { base: "aptos", ondeNome: "Brasil", status2: "" });
  const subs = h.slice(h.indexOf("el-subtotal"));
  assert.ok(subs.includes("el-duelo__sem") && !/0,00%/.test(subs.slice(subs.indexOf("Nulos"))));
});

test("legenda do 'Não voto' na barra de composição abre as três partes", async () => {
  const { barrasComposicao } = await import("../public/comparacaoView.js");
  const l = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 400, flavio: 300, outros: 20, validos: 720, pct: 100 };
  assert.ok(!barrasComposicao(l, l, "aptos").includes("cmp-leg-parte") && barrasComposicao(l, l, "aptos").includes("data-ct-nv"));
  const aberta = barrasComposicao(l, l, "aptos", { nvAberto: true });
  assert.equal((aberta.match(/cmp-leg-parte/g) || []).length, 3);
  assert.ok(!barrasComposicao(l, l, "validos", { nvAberto: true }).includes("data-ct-nv"));
});

test("busca de cidade no Comparar: campo de 44px antes do seletor, até 5 resultados 'Cidade · UF', sem acento e 'Onde Cidade · UF'", async () => {
  const { controlesComparacao, listaCidades } = await import("../public/comparacaoView.js");
  const { buscarCidades } = await import("../public/busca.js");
  const munis = { RJ: [{ cod: "60011", nome: "Niterói", ibge: "3303302" }, { cod: "60012", nome: "Nova Iguaçu", ibge: "1" }], SP: [{ cod: "71072", nome: "São Paulo", ibge: "2" }, { cod: "71073", nome: "São Pedro", ibge: "3" }] };
  const achadas = buscarCidades(munis, "NITEROI");
  assert.deepEqual(achadas.map((m) => `${m.nome} ${m.uf}`), ["Niterói RJ"]); // ignora acento e maiúsculas
  assert.ok(listaCidades(achadas, "NITEROI").includes("Niterói · RJ") && listaCidades(achadas, "NITEROI").includes("data-ct-cidade=\"RJ/60011\""));
  assert.equal((listaCidades(buscarCidades(munis, "sao"), "sao").match(/data-ct-cidade/g) || []).length, 2);
  assert.equal(listaCidades([], "a"), ""); // menos de 2 letras: sem resultados
  assert.ok(listaCidades([], "xyzw").includes("Nada encontrado"));
  const h = controlesComparacao({ uf: "RJ", mun: "60011", regiao: "", base: "validos", linha: "lula", medida: "pp", premissas: true, busca: "nit" }, { municipios: munis.RJ, cidades: achadas });
  assert.ok(h.indexOf("Buscar uma cidade") < h.indexOf("data-ct-uf") && h.includes('data-ct-busca value="nit"') && h.includes('role="listbox"'));
  assert.ok(h.includes("Niterói · RJ")); // a faixa de premissas: ONDE Cidade · UF
});

test("Comparar: linha de vantagem de Lula sobre Flávio entre o 2º finalista e Outros, na base da tela", async () => {
  const { quadroComparacao, celulaVantagem } = await import("../public/comparacaoView.js");
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 300, flavio: 400, outros: 20, validos: 720, pct: 100 };
  const l2 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 420, flavio: 300, outros: 0, validos: 720, pct: 60 };
  const aptos = quadroComparacao(l1, l2, { base: "aptos", ondeNome: "Brasil", status2: "" });
  assert.ok(aptos.indexOf("Flávio Bolsonaro") < aptos.indexOf("Vantagem de Lula sobre Flávio Bolsonaro") && aptos.indexOf("Vantagem de Lula") < aptos.indexOf("Outros candidatos"));
  assert.ok(aptos.includes("▼ −100") && aptos.includes("▼ −10,00 p.p.") && aptos.includes("▲ +120") && aptos.includes("▲ +12,00 p.p.")); // aptos: 30% − 40% e 42% − 30%
  const validos = quadroComparacao(l1, l2, { base: "validos", ondeNome: "Brasil", status2: "" });
  assert.ok(validos.includes("▼ −100") && validos.includes("▼ −13,89 p.p.") && validos.includes("▲ +120") && validos.includes("▲ +16,66 p.p.")); // válidos: 300/720 − 400/720 e 58,33 − 41,67 (a diferença dos percentuais mostrados)
  const semT2 = quadroComparacao(l1, null, { base: "aptos", ondeNome: "Brasil", status2: "" });
  assert.ok(semT2.includes("▼ −100") && /el-pod__vantagem"><span class="el-duelo__sem">—<\/span><\/span>/.test(semT2)); // 2º turno sem apuração: traço
  assert.ok(celulaVantagem({ votos: 10, pct: 50.004 }, { votos: 9, pct: 50 }).includes("Empate"));
  assert.equal(celulaVantagem(null, { votos: 1, pct: 1 }), `<span class="el-duelo__sem">—</span>`);
});

test("coluna Variação em duas linhas: votos (2º menos 1º) e p.p. com unidade; a vantagem de Lula varia entre os turnos", async () => {
  const { quadroComparacao, celulaVariacao, celulaVariacaoVantagem } = await import("../public/comparacaoView.js");
  const l1 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 300, flavio: 400, outros: 20, validos: 720, pct: 100 };
  const l2 = { aptos: 1000, comparecimento: 800, abstencao: 200, brancos: 30, nulos: 50, lula: 420, flavio: 300, outros: 5, validos: 725, pct: 60 };
  const h = quadroComparacao(l1, l2, { base: "aptos", ondeNome: "Brasil", status2: "" });
  assert.ok(h.includes("<b>▲ +120</b><small>+12,00 p.p.</small>")); // Lula
  assert.ok(h.includes("<b>▼ −100</b><small>−10,00 p.p.</small>")); // Flávio
  assert.ok(h.includes("<b>▲ +220</b><small>+22,00 p.p.</small>")); // vantagem: (+120) − (−100) votos; (+12,00) − (−10,00) p.p.
  assert.ok(h.includes("<b>▼ −15</b>")); // Outros: 5 − 20 votos
  assert.equal(celulaVariacao(null, null), "—");
  assert.equal(celulaVariacaoVantagem(null, { votos: 1, pp: 1 }), "—");
  const semT2 = quadroComparacao(l1, null, { base: "aptos", ondeNome: "Brasil", status2: "" });
  assert.ok(!semT2.includes("el-duelo__variacao"));
  // os p.p. seguem o cálculo do app (dp), não a subtração dos arredondados
  assert.ok(celulaVariacao(1000, 6.6049).includes("+6,60 p.p."));
});
