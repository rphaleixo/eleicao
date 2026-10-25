Barra fixa no rodapé do celular com cinco destinos: Apuração (a Marcha da apuração), Presidente, Governadores, Meu estado e Mais.

Use só em telas estreitas (até 1023px). A partir de 1024px entra o `MenuLateral`, com as mesmas áreas na mesma ordem. A barra libera o polegar: troca de contexto sem rolar até o topo.

O consumidor fornece: os cinco destinos, o destino atual (`aria-current`) e o espaço no fim da página (`padding-bottom` de 72px) para a barra não cobrir o rodapé.

- Cinco destinos, não mais. Cada um tem ícone de linha (22px, traço 2px) e rótulo curto de até 12 letras; o ativo leva uma faixa de 3px em `acento` e a cor `acento`.
- "Mais" abre uma folha com o resto: Senadores, Deputados, Partidos, Cenários, Geografia e Nulos. As áreas que não existem no turno (Senado e deputados no 2º turno) não aparecem; nada de item morto.
- O destino principal depende do turno: no 1º turno, troque Governadores por Deputados na barra e mande Governadores para o Mais. A ordem do `MenuLateral` não muda.
- Comparar turnos não é destino da barra: é uma opção do seletor de turno (1º turno, 2º turno, Comparar) logo abaixo do topo, em todas as telas.
- Altura mínima de 56px; respeita a área segura do aparelho (`env(safe-area-inset-bottom)`).
- Os ícones são de traço (`currentColor`), nada de emoji.
