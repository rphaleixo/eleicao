Os três candidatos mais votados lado a lado, com o primeiro maior e centralizado, seguidos de uma lista compacta dos próximos.

Use em "Mais votados" de deputados (por estado e no país) e nos top 10. Para senador e governador, `LinhaCandidato` é suficiente.

O consumidor fornece: posição, foto, nome de urna, partido (cor), votos e percentual, e a situação.

- O primeiro ocupa 1,18× a largura e leva a foto maior (72px contra 56px); a faixa superior de 5px é a cor do partido. A ordem visual é 2º, 1º, 3º.
- Eleito leva contorno de 2px em `eleito` e o selo ✓ com a palavra; quem não é eleito não leva selo.
- A lista compacta repete posição, nome, chip e votos, sem barra; toque abre a ficha.
- Em telas de 320px o pódio mantém três colunas: nomes quebram em duas linhas, nunca cortam.

Rodada 9: variante `el-podio--igual` para disputas majoritárias (Presidente, Governador), com três colunas e fotos do mesmo tamanho, sem o degrau do primeiro. Enquanto ninguém tem votos, os três ficam na ordem de urna e a posição some (`el-pod--sem-voto`, mostra "Sem votos"): nunca mostre "1º" para quem tem zero. A foto tem um único tamanho em todo o sistema: largura `foto-p` (48px), proporção 3:4, `object-position: 50% 20%` para manter o rosto. Na ficha, `foto-g` (96px).
