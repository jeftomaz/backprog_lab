# Modelo de dados

| Grupo | Campos | Persistência |
| --- | --- | --- |
| Configuração | `inputs`, `hidden`, `outputs`, `eta`, `alpha`, `tolerance`, `bias` | memória do navegador |
| Dados conhecidos | `x`, `t`, `w1`, `w2` | memória do navegador |
| Preparação | `weightMode` | memória do navegador |
| Caderno | `work`, `resultAnswers`, `resultCorrect` | memória do navegador |

Não há banco, rotas, contas ou dados remotos. Valores numéricos são convertidos e validados antes de entrar no estado.

Cada saída calculada `yₖ` tem um alvo conhecido `tₖ`: ambos têm a mesma cardinalidade, mas `yₖ` é a previsão e `tₖ` é a resposta desejada usada no erro.

No modo manual, pesos pendentes usam `null` até serem preenchidos; a prática valida ausência, todos os pesos zerados e simetria completa entre neurônios ocultos.

## Limites

- arquitetura: `inputs` e `hidden` de 1 a 8; `outputs` de 1 a 6;
- `eta`, `alpha` e alvos: de 0 a 1;
- `tolerance`: de 0,000001 a 1;
- entradas e pesos: de −1.000.000 a 1.000.000.
