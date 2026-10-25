import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.location = { search: "?turno=1" };
const { regrasDaTela, baseAtual, TEXTO_BASE } = await import("../public/regras.js");
const { ABAS } = await import("../public/config.js");

test("gaveta: o texto de 'Nesta tela' muda em cada tela", () => {
  const textos = ABAS.map((a) => regrasDaTela(a.id).texto);
  assert.equal(new Set(textos).size, ABAS.length);
  assert.ok(textos.every((t) => t.length > 60));
  assert.notEqual(regrasDaTela("estados", "governador").texto, regrasDaTela("estados", "dep-federal").texto); // em Meu estado, o cargo escolhido acrescenta a regra dele
  assert.ok(regrasDaTela("camara").texto.includes("quociente eleitoral"));
  assert.ok(regrasDaTela("geo").texto.includes("eleitores aptos"));
});

test("base ativa abaixo do título: texto de cada base e das telas com base própria", () => {
  assert.deepEqual(baseAtual("presidente", "validos"), ["Percentuais sobre", "votos válidos"]);
  assert.deepEqual(baseAtual("presidente", "totais"), ["Percentuais sobre", "eleitores aptos"]);
  assert.ok(baseAtual("geo", "validos")[0].includes("eleitores aptos"));
  assert.ok(TEXTO_BASE.validos.includes("Brancos, nulos e abstenções ficam de fora"));
});

test("nenhuma tela tem mais o painel recolhido 'Como calcular' no fim", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8"), html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(!html.includes('id="calculo"') && !app.includes('$("calculo")'));
  assert.ok(!/<summary>Como calcular<\/summary>/.test(app));
  assert.ok(html.includes('id="gaveta"'));
});

test("gaveta fechada tem display none (não ocupa espaço nem cobre o conteúdo)", () => {
  const css = fs.readFileSync(new URL("../public/ds/bundle.css", import.meta.url), "utf8") + fs.readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
  assert.match(css, /dialog\.el-gaveta:not\(\[open\]\)\s*\{[^}]*display:\s*none/);
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(/<dialog id="gaveta"[^>]*el-gaveta/.test(html) && !/<dialog id="gaveta"[^>]*\sopen/.test(html));
});

test("nenhum horário de divulgação fixo no código nem nos textos", () => {
  for (const f of ["../public/app.js", "../public/config.js", "../worker/index.js", "../public/segundoTurno.js", "../public/comparacaoView.js"]) {
    const t = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/\b17h\b|T17:00|às 17|17:00:00/.test(t), `${f} cita um horário fixo`);
  }
  const hero = fs.readFileSync(new URL("../public/marcha.js", import.meta.url), "utf8");
  assert.ok(hero.includes("avisoDadosIniciais") && hero.includes("Os números iniciais mudam bastante"));
});

test("alinhamento: um só contêiner de página, sem larguras diferentes por rota", () => {
  const css = fs.readFileSync(new URL("../public/style.css", import.meta.url), "utf8"), html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(!/body\[data-aba[^{]*\.wrap/.test(css) && !/body\[data-aba[^{]*#conteudo\s*\{[^}]*max-width/.test(css), "nenhuma regra por rota muda a largura ou a borda do conteúdo");
  assert.equal((html.match(/class="el-pagina"/g) || []).length, 1);
  assert.ok(html.indexOf('class="el-pagina"') < html.indexOf('id="modos"') && html.indexOf('id="modos"') < html.indexOf('id="conteudo"') && html.indexOf('id="conteudo"') < html.indexOf('class="rodape"'));
  assert.ok(!/<(nav|div|section|main|footer)[^>]*class="wrap/.test(html.slice(html.indexOf('class="el-pagina"'), html.indexOf('id="barra-inf"'))), "nada de .wrap irmão dentro da página");
  assert.ok(html.includes('class="pular"') && html.includes('id="conteudo" tabindex="-1"'));
});
