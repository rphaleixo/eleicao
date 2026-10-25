Lista de opções em que só uma pode estar ativa, com o rótulo inteiro visível e uma linha de apoio opcional.

Use em Cenários (três hipóteses de federação) e em qualquer escolha com 3 ou mais opções de texto longo. Para duas opções curtas use `Visao`; para ligar e desligar algo use `Chave`; para marcar várias, `Abas` em modo filtro (caixas quadradas).

O consumidor fornece: o nome do grupo (legenda), as opções com rótulo e uma frase de apoio, e a opção ativa.

- É um `fieldset` com `input type="radio"` de verdade: teclado e leitor de tela funcionam sem script. As setas trocam de opção.
- A forma distingue da caixa de marcar: círculo para escolha única, quadrado para várias. A opção ativa também ganha a faixa lateral de acento e o fundo, nunca só o ponto.
- Linhas de 48px; o rótulo quebra em duas linhas se precisar, sem cortar nem rolar na horizontal.
- Trocar de opção atualiza a tela na hora, sem botão Aplicar.
