// Mede a altura da página (scrollHeight) antes e depois de um toast aparecer: tem de ser a mesma.
// Uso: BASE=http://localhost:8798 node tools/medir-toast.mjs  (precisa de playwright, como nos outros scripts de medição)
import { createRequire } from "node:module";
const require = createRequire(process.env.NODE_TOOLS ?? "/node-tools/node_modules/");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:8798", saida = process.env.SAIDA ?? ".";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
let falhou = false;
for (const [nome, w, h] of [["m", 390, 844], ["d", 1366, 900]]) for (const esq of ["light", "dark"]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, colorScheme: esq })).newPage();
  await p.goto(`${base}/?turno=2#/andamento`); await p.waitForTimeout(12000);
  const altura = () => p.evaluate(() => [document.documentElement.scrollHeight, document.body.scrollHeight, Math.round(document.querySelector("main#conteudo").getBoundingClientRect().height)]);
  const antes = await altura();
  await p.evaluate(() => import("/toast.js").then((m) => m.mostrarToast({ assunto: "demora", estado: "t", titulo: "Está demorando mais que o normal.", apoio: "O TSE pode estar lento ou a conexão falhou.", acao: { rotulo: "Tentar agora", atributo: "data-tentar" } })));
  await p.waitForTimeout(400);
  const depois = await altura();
  const caixa = await p.locator(".el-toast").first().boundingBox();
  const ok = JSON.stringify(antes) === JSON.stringify(depois);
  if (!ok) falhou = true;
  console.log(nome, esq, "antes", antes, "depois", depois, ok ? "IGUAL" : "MUDOU", "| toast", caixa && [Math.round(caixa.x), Math.round(caixa.y), Math.round(caixa.width), Math.round(caixa.height)], "| botões", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll(".el-toast button")].map((x) => Math.round(x.getBoundingClientRect().height)))));
  await p.screenshot({ path: `${saida}/toast-${nome}-${esq}.png` });
  await p.close();
}
await b.close();
process.exit(falhou ? 1 : 0);
