// Ficha do candidato lida do banco D1. Nunca devolve o identificador derivado do CPF.
export const CARGOS_NOME = {
  1: "Presidente", 2: "Vice-presidente", 3: "Governador", 4: "Vice-governador", 5: "Senador",
  6: "Deputado Federal", 7: "Deputado Estadual", 8: "Deputado Distrital", 9: "1º suplente de senador", 10: "2º suplente de senador",
};

export async function fichaDoCandidato(db, sq) {
  const c = await db.prepare(
    `SELECT c.sq, c.pessoa_id, c.eleicao, c.turno, c.cargo, c.uf, c.numero, c.nome_urna, c.partido, c.federacao, c.tp_agremiacao,
            c.sq_coligacao, c.situacao, c.julgamento, c.situacao_urna, c.destinacao_votos, c.idade_posse, c.reeleicao, c.substituido, c.vr_despesa_max,
            p.nome, p.ano_nascimento, p.genero, p.cor_raca, p.grau_instrucao, p.ocupacao, p.uf_nascimento
       FROM candidatura c JOIN pessoa p ON p.id = c.pessoa_id WHERE c.sq = ?`).bind(sq).first();
  if (!c) return null;
  const [agr, bens, hist, outras] = await db.batch([
    db.prepare("SELECT nome, federacao, composicao, tp_agremiacao FROM agremiacao WHERE uf = ? AND cargo = ? AND sq_coligacao = ? LIMIT 1").bind(c.uf, c.cargo, c.sq_coligacao ?? -1),
    db.prepare("SELECT tipo, descricao, valor FROM bem WHERE sq = ? ORDER BY valor DESC").bind(sq),
    db.prepare(`SELECT ano, turno, cargo_nome, uf, municipio, partido, numero, resultado, julgamento FROM historico WHERE sq_atual = ? ORDER BY ano DESC, turno DESC`).bind(sq),
    db.prepare("SELECT sq, cargo, uf FROM candidatura WHERE pessoa_id = ? AND sq <> ?").bind(c.pessoa_id, sq),
  ]);
  const itens = bens.results;
  return {
    sq: c.sq, eleicao: c.eleicao, cargo: c.cargo, cargoNome: CARGOS_NOME[c.cargo] ?? String(c.cargo), uf: c.uf, numero: c.numero,
    nomeUrna: c.nome_urna, nome: c.nome, partido: c.partido, federacao: c.federacao,
    agremiacao: agr.results[0] ? { tipo: agr.results[0].tp_agremiacao, nome: agr.results[0].nome, composicao: agr.results[0].composicao } : null,
    julgamento: c.julgamento, destinacaoVotos: c.destinacao_votos, situacaoUrna: c.situacao_urna,
    idade: c.idade_posse, reeleicao: c.reeleicao, substituido: c.substituido, tetoGastos: c.vr_despesa_max,
    pessoa: { anoNascimento: c.ano_nascimento, genero: c.genero, corRaca: c.cor_raca, instrucao: c.grau_instrucao, ocupacao: c.ocupacao, ufNascimento: c.uf_nascimento },
    outrasCandidaturas: outras.results.map((o) => ({ sq: o.sq, cargoNome: CARGOS_NOME[o.cargo] ?? String(o.cargo), uf: o.uf })),
    bens: { total: itens.reduce((s, b) => s + b.valor, 0), itens },
    historico: hist.results,
  };
}
