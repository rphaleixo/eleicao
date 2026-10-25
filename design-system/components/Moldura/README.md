Esquema de página: onde ficam topo, status, turno, escopo, conteúdo, menu e barras em cada tamanho de tela.

Use como régua para montar qualquer tela. No celular é uma coluna, com topo e status no alto, turno e escopo logo abaixo, o conteúdo e, por fim, rodapé e barra inferior fixa. No desktop (1024px ou mais) entram o `MenuLateral` de 240px, o conteúdo central de até 720px e uma coluna lateral de 320px para mapa e destaques; a barra inferior some.

- O primeiro resultado (`Placar`) aparece sem rolar: no máximo topo, status e uma linha de turno e escopo antes dele.
- Controles de cálculo (`Painel`) e `Rodape` ficam sempre abaixo do resultado.
- Entre 700 e 1023px: coluna única, centralizada em 720px, com barra inferior.

Orçamento de altura (rodada 6), a regra que vale para todas as telas: a navegação não pode empurrar o conteúdo para fora da tela. No celular (altura útil de uns 700px), o que fica antes do primeiro resultado soma no máximo 140px: topo com status de 48px, uma linha de turno e escopo de 44px e, só nas telas com região (Presidente, Governadores, Meu estado), uma linha de escopo recolhida de 46px (`FiltroRegiao`); soma 138px. As áreas principais ficam na barra inferior de 56px (5 destinos: Apuração, Presidente, Governadores, Meu estado e Mais; não tira altura do fluxo, só do rodapé da tela); as abas só aparecem para subníveis dentro de uma área. No desktop o menu lateral e a coluna lateral usam a largura, e o topo continua com 48px.


Rodada 9: no desktop use `el-pagina` (máx. 1064px) e `el-pagina--duas`: coluna central de 720px e coluna lateral de 320px para o resumo e o escopo. Não repita o título no topo quando o menu lateral já o mostra (`el-topo__titulo--mobile`, escondido a partir de 1024px). Se a rota existir só num turno (ex.: Senado no 2º turno), mostre um `Aviso` explicando e ofereça voltar ao 1º turno, em vez de uma tela vazia.
