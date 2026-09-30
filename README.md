# Backprop Lab

Laboratório visual para estudar redes neurais com uma camada oculta, forward propagation e backpropagation.

## Arquivos

- `index.html` — estrutura da interface
- `styles.css` — layout responsivo, foco visual e modo escuro
- `app.js` — rede, exercícios, validação, diagrama e interação

## Recursos

- número variável de entradas, neurônios ocultos e saídas;
- bias opcional;
- presets XOR e Iris;
- fluxo em duas etapas: Preparação e Prática;
- edição centralizada de entradas, alvos e pesos, com validação numérica;
- diagrama SVG consultivo: clicar em um nó destaca somente suas conexões;
- prática guiada: os dados conhecidos vêm da Preparação e o aluno preenche cada resultado calculado;
- caderno único com os resultados validados, reutilizados automaticamente nas próximas fórmulas;
- validação visual verde/vermelha;
- fórmula geral e substituição sempre visíveis;
- backpropagation dividido em etapas menores: erro simples, delta de saída, erro que volta, delta oculto, atualização dos pesos;
- taxa de aprendizado e momentum configuráveis;
- modo escuro persistente;
- responsivo para desktop e mobile, priorizando o cálculo em telas menores;
- exportação do estado em JSON;
- trechos equivalentes em C por etapa;
- sem dependências externas.

## GitHub Pages

1. Envie todo o projeto para a branch `main`.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **GitHub Actions**.
4. O workflow `.github/workflows/deploy-pages.yml` publica automaticamente cada push em `main`.

O projeto é totalmente estático e não exige build local.

## Conceito dos alvos (`t`)

O número de alvos é igual ao número de neurônios de saída, não ao número de entradas. Em treinamento supervisionado, cada `t` informa a resposta desejada para uma saída e permite calcular o erro. No XOR deste laboratório há 2 entradas e apenas 1 saída, portanto existe apenas um alvo. No Iris há 3 saídas, então existem 3 alvos (one-hot).
