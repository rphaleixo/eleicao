// Carga única do banco de candidatos (D1). Os arquivos SQL ficam em public/_seed/ (bloqueados
// ao público, só o Worker lê). A cada minuto, a rotina agendada aplica os próximos arquivos
// que ainda não constam na tabela "carga". Quando termina, grava "concluido" e não faz mais nada.
const POR_EXECUCAO = 8;

export function comandos(sql) {
  return sql.split("\n").map((l) => l.trim()).filter(Boolean);
}

export async function carregarSeed(env) {
  if (!env.DB) return { feito: true };
  const { results } = await env.DB.prepare("SELECT arquivo FROM carga").all();
  const feitos = new Set(results.map((r) => r.arquivo));

  const lerAsset = (nome) => env.ASSETS.fetch(new Request(`https://assets.local/_seed/${nome}`));
  const ri = await lerAsset("indice.json");
  if (!ri.ok) return { feito: true, motivo: "sem seed" };
  const { arquivos } = await ri.json();
  const marca = `concluido-${arquivos}`;
  if (feitos.has(marca)) return { feito: true };

  let aplicados = 0;
  for (let i = 1; i <= arquivos && aplicados < POR_EXECUCAO; i++) {
    const nome = String(i).padStart(3, "0") + ".sql";
    if (feitos.has(nome)) continue;
    const r = await lerAsset(nome);
    if (!r.ok) throw new Error(`seed ${nome}: HTTP ${r.status}`);
    const cmds = comandos(await r.text());
    await env.DB.batch(cmds.map((c) => env.DB.prepare(c)));
    await env.DB.prepare("INSERT OR REPLACE INTO carga (arquivo, linhas, carregado_em) VALUES (?, ?, ?)")
      .bind(nome, cmds.length, new Date().toISOString()).run();
    feitos.add(nome); aplicados++;
  }
  const completo = Array.from({ length: arquivos }, (_, i) => String(i + 1).padStart(3, "0") + ".sql").every((n) => feitos.has(n));
  if (completo) {
    await env.DB.prepare("INSERT OR REPLACE INTO carga (arquivo, linhas, carregado_em) VALUES (?, ?, ?)").bind(marca, arquivos, new Date().toISOString()).run();
  }
  return { feito: completo, aplicados };
}
