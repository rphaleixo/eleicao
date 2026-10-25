#!/usr/bin/env node
// Mede a borda esquerda do seletor de turno, da barra de escopo (ou do que a substitui) e do primeiro bloco do conteúdo em todas as rotas.
// Todas precisam ter o mesmo valor: nenhuma tela pode deslocar a página para o lado.
// Uso: node tools/medir-alinhamento.mjs [URL base, padrão http://localhost:8788] [largura] [altura]
import { createRequire } from "node:module";
const require = createRequire("/node-tools/node_modules/");
const { chromium } = require("playwright");
const base = process.argv[2] || "http://localhost:8788", w = Number(process.argv[3] || 390), h = Number(process.argv[4] || 844);
const ROTAS = (process.env.ROTAS ? process.env.ROTAS.split(",") : ["andamento", "presidente", "governadores", "senadores", "camara", "estados/RJ", "partidos", "cenarios", "geo", "nulos", "turnos/BR"]);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
const linhas = [];
for (const r of ROTAS) {
  await p.goto(`${base}/?turno=1#/${r}`); await p.waitForTimeout(Number(process.env.ESPERA || 9000));
  const m = await p.evaluate(() => {
    const x = (el) => (el ? Math.round(el.getBoundingClientRect().left) : null);
    const visivel = (s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0);
    return { turno: x(visivel(".el-turnos")), escopo: x(visivel("#nav > *, #sub > *")), conteudo: x(document.querySelector("#conteudo > :not(.hero)")), rodape: x(document.querySelector(".rodape")), premissas: x(visivel(".el-premissas")) };
  });
  linhas.push([r, m]);
  console.log(r.padEnd(14), JSON.stringify(m));
}
const refs = new Set(linhas.flatMap(([, m]) => Object.values(m).filter((v) => v != null)));
console.log(refs.size === 1 ? `OK: tudo alinhado em ${[...refs][0]}px` : `FALHA: bordas diferentes ${[...refs].sort((a, c) => a - c).join(", ")}`);
await b.close();
process.exit(refs.size === 1 ? 0 : 1);
