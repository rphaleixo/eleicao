Seletor de turno em três células iguais: 1º turno, 2º turno e Comparar. Substitui a régua com trilho e marcadores (`el-seg--turno`) para a troca de turno.

Por que mudou: na régua, o trecho azul que se estendia à direita parecia uma barra de progresso, o marcador de 16px era um alvo de toque pequeno e o usuário que navega muito precisava ler o desenho para saber onde estava. Aqui a célula ativa é invertida (fundo escuro, texto claro) com 4px de acento embaixo, e cada célula inteira é o alvo de toque.

O consumidor fornece: os turnos que existem (some o que não existe, ex.: 2º turno antes de 25/10), as datas e o turno ativo.

- 44px de altura, `aria-pressed` na ativa, máximo de 480px.
- Comparar leva o símbolo ⇄ e aparece só quando os dois turnos têm dados.
- Trocar de turno mantém a tela e o escopo atuais (mesma área, mesmo estado) sempre que a área existir no outro turno; se não existir, `Aviso` com link, nunca tela vazia.
- `el-turnos-barra` fica presa abaixo do topo (48px) e se esconde ao rolar para baixo, voltando ao rolar para cima: o app marca `data-turno-oculto` no `<html>` e as premissas fixas sobem sozinhas (`--alt-fixa` passa de 92px para 48px). Com isso, quem lê tabelas longas ganha 44px.
- Opcional: deslizar o dedo para o lado troca de turno.
