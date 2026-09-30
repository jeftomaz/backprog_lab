# Contratos de interface

| Elemento | Regra |
| --- | --- |
| Ícone `?` | Abre explicação central sem alterar o valor associado. |
| Escala | Texto-base de 17 px; controles interativos têm alvo mínimo de 46 px e permanecem legíveis em mobile. |
| Preparação | Único local editável; arquitetura fica aberta e atualiza entradas, alvos e matrizes de pesos. |
| Guia rápido | Explica `x`, `h`, `y`, `t`, pesos e bias; cada saída `yₖ` tem um alvo `tₖ`, mas previsão e alvo são valores distintos. |
| Pesos manuais | Limpa as matrizes e exige todos os valores antes de iniciar; bloqueia pesos inteiramente zerados e neurônios ocultos com pesos idênticos. |
| Prática | Exibe uma etapa por vez; identifica explicitamente o símbolo a responder e mantém apenas a ação útil para o estado atual habilitada. |
| Resposta aceita | Mantém confirmação verde com o valor registrado e libera a próxima etapa. |
| Calculadora científica | Aceita funções e operadores pré-definidos localmente; pode transferir resultado finito para a resposta, sem avaliar código. |
| Diagrama e inspetor | Entradas, alvos e conexões aceitam clique, `Enter` e espaço; o inspetor permite editar o valor validado. |
| Caderno | Única visão consolidada; exibe apenas resultados aceitos ou revelados. |
| Fórmula | Usa texto puro, símbolos gregos e substituição automática. |
| Foco | Na prática, acompanha o cálculo; fora dela, clicar fora do nó remove o foco manual. |
| Alteração ativa | A Preparação avisa; no diagrama, uma confirmação antecede a edição que reinicia o progresso. |
