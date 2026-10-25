#!/usr/bin/env node
// Gera public/dados/presidente-tN-municipios.json (Lula, Flávio Bolsonaro, outros, brancos, nulos e abstenção por município)
// a partir dos dados abertos do TSE, sem pedir nada ao site de resultados:
//   votacao_candidato_munzona_2026.zip  -> votacao_candidato_munzona_2026_BR.csv   (candidatos a presidente, por município e zona)
//   detalhe_votacao_munzona_2026.zip    -> detalhe_votacao_munzona_2026_BR.csv     (aptos, comparecimento, abstenções, brancos e nulos)
// Os arquivos ficam em https://cdn.tse.jus.br/estatistica/sead/odsele/ (votacao_candidato_munzona/ e detalhe_votacao_munzona/).
//
// Uso: node tools/importar-presidente-munzona.mjs --candidatos <csv> --detalhe <csv> [--turno 1] [--saida public/dados] [--municipios <mun-e006257-cm.json>]
// O arquivo de municípios (config/mun-e006257-cm.json do TSE) é opcional: traz o código do IBGE de cada município, usado para desenhar o mapa.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opcao = (n, padrao) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : padrao; };
const arqCand = opcao("candidatos"), arqDet = opcao("detalhe"), turno = Number(opcao("turno", 1)), pasta = opcao("saida", "public/dados"), arqMun = opcao("municipios");
if (!arqCand || !arqDet) { console.error("Informe --candidatos e --detalhe (veja o início do arquivo)."); process.exit(1); }
const LULA = "13", FLAVIO = "22";

function* linhasCsv(arq) {
  const texto = readFileSync(arq, "latin1").split(/\r?\n/);
  const cab = texto[0].split(";").map((c) => c.replace(/^"|"$/g, ""));
  for (let i = 1; i < texto.length; i++) {
    if (!texto[i]) continue;
    const c = []; let atual = "", aspas = false;
    for (const ch of texto[i]) { if (ch === '"') aspas = !aspas; else if (ch === ";" && !aspas) { c.push(atual); atual = ""; } else atual += ch; }
    c.push(atual);
    yield Object.fromEntries(cab.map((k, j) => [k, c[j] ?? ""]));
  }
}
const n = (v) => Number(v) || 0;

const ibge = new Map();
if (arqMun) for (const u of JSON.parse(readFileSync(arqMun, "utf8")).abr ?? []) for (const m of u.mu ?? []) ibge.set(String(m.cd).padStart(5, "0"), String(m.cdi ?? ""));

const m = {}, ext = {}; // município (ou localidade no exterior) -> acumulado
const alvo = (cod, uf, nome) => ((uf === "ZZ" ? ext : m)[cod] ??= { nome, uf, aptos: 0, comp: 0, abst: 0, brancos: 0, nulos: 0, lula: 0, flavio: 0, outros: 0, validos: 0 });
const candidatos = {};
for (const r of linhasCsv(arqDet)) {
  if (r.DS_CARGO !== "Presidente" || n(r.NR_TURNO) !== turno) continue;
  const a = alvo(r.CD_MUNICIPIO.padStart(5, "0"), r.SG_UF, r.NM_MUNICIPIO);
  a.aptos += n(r.QT_APTOS); a.comp += n(r.QT_COMPARECIMENTO); a.abst += n(r.QT_ABSTENCOES); a.brancos += n(r.QT_VOTOS_BRANCOS); a.nulos += n(r.QT_TOTAL_VOTOS_NULOS); a.validos += n(r.QT_TOTAL_VOTOS_VALIDOS);
}
for (const r of linhasCsv(arqCand)) {
  if (r.DS_CARGO !== "Presidente" || n(r.NR_TURNO) !== turno) continue;
  const a = (r.SG_UF === "ZZ" ? ext : m)[r.CD_MUNICIPIO.padStart(5, "0")]; if (!a) continue;
  const v = n(r.QT_VOTOS_NOMINAIS_VALIDOS);
  if (r.NR_CANDIDATO === LULA) { a.lula += v; candidatos[LULA] = r.NM_URNA_CANDIDATO; } else if (r.NR_CANDIDATO === FLAVIO) { a.flavio += v; candidatos[FLAVIO] = r.NM_URNA_CANDIDATO; } else a.outros += v;
}
const municipios = Object.fromEntries(Object.entries(m).map(([cod, a]) => [cod, [a.uf, ibge.get(cod) ?? "", a.aptos, a.comp, a.abst, a.brancos, a.nulos, a.lula, a.flavio, a.outros, a.validos, 100]]));
const localidades = Object.fromEntries(Object.entries(ext).map(([cod, a]) => [cod, [a.nome, a.aptos, a.comp, a.abst, a.brancos, a.nulos, a.lula, a.flavio, a.outros, a.validos, 100]]));
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, `presidente-t${turno}-exterior.json`), JSON.stringify({ turno, geradoEm: new Date().toISOString(), final: true, colunas: ["nome", "aptos", "comparecimento", "abstencao", "brancos", "nulos", "lula", "flavio", "outros", "validos", "pctSecoes"], localidades }));
const saida = join(pasta, `presidente-t${turno}-municipios.json`);
writeFileSync(saida, JSON.stringify({ turno, eleicao: turno === 1 ? "6257" : "6258", geradoEm: new Date().toISOString(), fonte: "dados abertos do TSE (votação por município e zona)", final: true, candidatos,
  colunas: ["uf", "ibge", "aptos", "comparecimento", "abstencao", "brancos", "nulos", "lula", "flavio", "outros", "validos", "pctSecoes"], municipios }));
const soma = (i) => Object.values(municipios).reduce((t, a) => t + a[i], 0);
console.log(`Exterior: ${Object.keys(localidades).length} localidades. ${Object.keys(municipios).length} municípios. Aptos ${soma(2)}, abstenções ${soma(4)}, brancos ${soma(5)}, nulos ${soma(6)}, Lula ${soma(7)}, Flávio ${soma(8)}, outros ${soma(9)}, válidos ${soma(10)}. Salvo em ${saida}`);
