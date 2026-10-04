// Senadores em exercício eleitos em 2022 (mandatos até 2031), a partir dos dados abertos do Senado.
// O JSON não traz o ano da eleição: ele é deduzido da PRIMEIRA legislatura do mandato
// (57ª, início em 2023-02-01 = eleito em 2022; 56ª, início em 2019-02-01 = eleito em 2018).
export const URL_SENADO = "https://legis.senado.leg.br/dadosabertos/dados/ListaParlamentarEmExercicio.json";

/**
 * @param {object} json ListaParlamentarEmExercicio
 * @returns {{senadores: object[], total: number, versao: string}} só os do ciclo de 2022; suplentes trazem o nome do titular
 */
export function senadoresEleitosEm2022(json) {
  const lista = json?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
  const senadores = lista.filter((p) => {
    const pl = p?.Mandato?.PrimeiraLegislaturaDoMandato;
    return pl?.NumeroLegislatura === "57" && pl?.DataInicio === "2023-02-01";
  }).map((p) => {
    const id = p.IdentificacaoParlamentar ?? {}, m = p.Mandato ?? {};
    const participacao = m.DescricaoParticipacao || "Titular";
    return {
      codigo: id.CodigoParlamentar, nome: id.NomeParlamentar, nomeCompleto: id.NomeCompletoParlamentar,
      partido: id.SiglaPartidoParlamentar || "S/Partido", uf: m.UfParlamentar || id.UfParlamentar,
      foto: id.UrlFotoParlamentar ? String(id.UrlFotoParlamentar).replace(/^http:/, "https:") : null,
      participacao, titular: participacao === "Titular" ? null : m.Titular?.NomeParlamentar ?? null,
    };
  }).sort((a, b) => a.uf.localeCompare(b.uf));
  return { senadores, total: senadores.length, versao: json?.ListaParlamentarEmExercicio?.Metadados?.Versao ?? "" };
}
