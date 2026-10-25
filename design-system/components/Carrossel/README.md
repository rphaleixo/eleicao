Fileira de cartões que se deslizam na horizontal, um por vez.

Use para disputas que o usuário percorre em sequência (cartões de governadores, candidatos).

- Cada cartão ocupa a largura toda menos 28px, mostrando só a ponta do próximo, à direita. Não mostre espiada à esquerda.
- O indicador "1 de 5" (`el-carrossel__pos`) fica abaixo e é anunciado por `aria-live="polite"`.
- `scroll-snap-type: x mandatory`; sem barra de rolagem visível.
