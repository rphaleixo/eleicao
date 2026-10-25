#!/usr/bin/env node
// Gera public/ds/tokens.css a partir de design-system/tokens.json (fonte única de cores, espaços, cantos, sombras e fontes).
// Tema claro em :root; escuro em [data-theme="escuro"] e, sem tema escolhido, por prefers-color-scheme.
// Uso: node tools/gerar-tokens.mjs
import { readFileSync, writeFileSync } from "node:fs";
const t = JSON.parse(readFileSync("design-system/tokens.json", "utf8"));
const tema = (id) => t.color.tokens.map((c) => `  --${c.name}: ${c.value[id]};`).join("\n");
const outros = [...t.spacing.tokens, ...t.radius.tokens, ...t.shadow.tokens].map((x) => `  --${x.name}: ${x.value};`).join("\n");
const f = t.type.families;
const fam = `  --font-display: ${f.display};\n  --font-text: ${f.text};\n  --font-num: ${f.num};`;
const css = `/* Gerado por tools/gerar-tokens.mjs a partir de design-system/tokens.json. Não edite à mão. */
@font-face { font-family: "Bebas Neue"; src: url(fonts/BebasNeue-Regular.woff2) format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Special Gothic"; src: url(fonts/SpecialGothic-Variable.woff2) format("woff2"); font-weight: 400 700; font-display: swap; }
:root {
${tema("claro")}
${outros}
${fam}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="claro"]) {
${tema("escuro").replace(/^ {2}/gm, "    ")}
  }
}
[data-theme="escuro"] {
${tema("escuro")}
}
`;
writeFileSync("public/ds/tokens.css", css);
console.log(`tokens.css: ${t.color.tokens.length} cores, ${t.spacing.tokens.length + t.radius.tokens.length + t.shadow.tokens.length} medidas`);
