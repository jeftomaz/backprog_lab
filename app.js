(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const parseNum = (v) => Number(String(v ?? '').trim().replace(',', '.'));
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v) || min)));
  const rand = (min = -0.8, max = 0.8) => +(min + Math.random() * (max - min)).toFixed(2);
  const fmt = (n, d = 6) => {
    if (!Number.isFinite(n)) return '—';
    const s = n.toFixed(d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return s.replace('.', ',');
  };
  const deepCopy = (m) => m.map(r => r.slice());
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const el = {
    sidebar: $('sidebar'), sidebarScrim: $('sidebarScrim'), openSidebarBtn: $('openSidebarBtn'), closeSidebarBtn: $('closeSidebarBtn'),
    inputCount: $('inputCount'), hiddenCount: $('hiddenCount'), outputCount: $('outputCount'), learningRate: $('learningRate'), momentum: $('momentum'), tolerance: $('tolerance'),
    useBias: $('useBias'), weightLabelMode: $('weightLabelMode'),
    randomizeBtn: $('randomizeBtn'), resetAllBtn: $('resetAllBtn'), presetXorBtn: $('presetXorBtn'), presetIrisBtn: $('presetIrisBtn'),
    valuesEditor: $('valuesEditor'), setupNotice: $('setupNotice'), setupFeedback: $('setupFeedback'), startBtn: $('startBtn'), editSetupBtn: $('editSetupBtn'), resetProgressBtn: $('resetProgressBtn'), exportBtn: $('exportBtn'),
    progressBadge: $('progressBadge'), progressBar: $('progressBar'), phaseLabel: $('phaseLabel'),
    themeBtn: $('themeBtn'), themeIcon: $('themeIcon'), themeText: $('themeText'),
    networkDiagram: $('networkDiagram'), focusInfo: $('focusInfo'),
    stepTitle: $('stepTitle'), stepCounter: $('stepCounter'), stepContext: $('stepContext'), formulaStatic: $('formulaStatic'), formulaValues: $('formulaValues'), formulaLegend: $('formulaLegend'),
    resultBlock: $('resultBlock'), resultPrompt: $('resultPrompt'),
    answerInput: $('answerInput'), checkBtn: $('checkBtn'), feedback: $('feedback'), prevBtn: $('prevBtn'), nextBtn: $('nextBtn'), hintBtn: $('hintBtn'), revealBtn: $('revealBtn'),
    codeSnippet: $('codeSnippet'), neuronInspector: $('neuronInspector'), summaryTables: $('summaryTables'),
    helpModal: $('helpModal'), helpTitle: $('helpTitle'), helpBody: $('helpBody'), closeHelpBtn: $('closeHelpBtn')
  };

  const HELP = {
    learningRate: ['Taxa de aprendizado (η)', 'Controla o tamanho da correção aplicada aos pesos. Valores maiores aprendem mais rápido, mas podem tornar as atualizações instáveis.'],
    momentum: ['Momentum (α)', 'Acrescenta parte da correção anterior à correção atual. Ele ajuda a manter a direção do aprendizado em sequências de exemplos.'],
    tolerance: ['Tolerância', 'Margem aceita ao conferir uma resposta numérica. A comparação usa a maior margem entre a tolerância e essa fração do resultado esperado.'],
    bias: ['Bias', 'O bias é uma entrada constante b = 1. Seus pesos aparecem como uma linha nas matrizes w1 e w2.'],
    values: ['Entradas, alvos e pesos', 'Este é o único local de edição dos dados conhecidos. O diagrama e a prática usam estes mesmos valores automaticamente.'],
    inputValues: ['Entradas x', 'São os valores apresentados à rede.'],
    targets: ['Alvos t', 'É a resposta correta desejada para cada saída. O erro simples é calculado como t − O_y.'],
    w1: ['Pesos w1', 'Pesos das conexões entre entradas e camada oculta. Cada peso multiplica o valor que sai da sua origem.'],
    w2: ['Pesos w2', 'Pesos das conexões entre camada oculta e saídas. Eles são usados no forward e no retorno do erro.'],
    diagram: ['Diagrama interativo', 'Clique em um neurônio para destacar as conexões relacionadas e abrir seu inspetor. A edição dos dados fica concentrada na etapa Preparação.'],
    formula: ['Fórmula simbólica', 'Mostra a equação da etapa em notação de texto, com símbolos gregos como η, α e δ.'],
    substitution: ['Substituição automática', 'Substitui na fórmula os mesmos valores definidos na Preparação e os resultados que você já validou. Não é necessário copiá-los para outro formulário.'],
    variables: ['Dados usados', 'Esta lista mostra a origem de cada valor da fórmula atual. Valores calculados em etapas anteriores são liberados somente depois de você resolvê-los.'],
    result: ['Resultado da etapa', 'Faça a conta mostrada acima e insira somente o resultado pedido. Quando aceito, ele é registrado no caderno e passa a ser usado nas fórmulas seguintes.']
  };

  function helpButton(topic, label = 'Explicar este item') {
    return `<button class="help-icon" data-help="${esc(topic)}" aria-label="${esc(label)}">?</button>`;
  }

  const state = {
    cfg: { inputs: 2, hidden: 2, outputs: 1, eta: 0.5, alpha: 0, tolerance: 0.002, bias: true },
    x: [1, 0], t: [1],
    w1: [[0.4, -0.2], [-0.3, 0.5], [0.1, -0.1]],
    w2: [[0.7], [-0.4], [0.2]],
    prevW1: [], prevW2: [],
    z1: [], o1: [], z2: [], o2: [], e2: [], d2: [], r1: [], d1: [], nw1: [], nw2: [],
    steps: [], stepIndex: -1, started: false,
    work: {}, resultAnswers: {}, resultCorrect: {}, revealed: {},
    focus: null, focusFromStep: true
  };

  function setPanel(panelId) {
    document.querySelectorAll('.section-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.panel === panelId));
    document.querySelectorAll('.sidebar-panel').forEach(panel => panel.classList.toggle('active', panel.id === panelId));
  }

  function showSetupFeedback(message, type = 'bad') {
    el.setupFeedback.className = `feedback ${type}`;
    el.setupFeedback.textContent = message;
  }

  function validateConfiguration() {
    const fields = [el.inputCount, el.hiddenCount, el.outputCount, el.learningRate, el.momentum, el.tolerance];
    const integerFields = new Set([el.inputCount, el.hiddenCount, el.outputCount]);
    let valid = true;
    for (const input of fields) {
      const value = parseNum(input.value);
      const min = Number(input.min);
      const max = Number(input.max);
      const fieldValid = Number.isFinite(value) && value >= min && value <= max && (!integerFields.has(input) || Number.isInteger(value));
      input.setAttribute('aria-invalid', String(!fieldValid));
      valid = valid && fieldValid;
    }
    if (!valid) showSetupFeedback('Revise os campos destacados da configuração.');
    else if (el.setupFeedback.classList.contains('bad')) showSetupFeedback('', '');
    return valid;
  }

  function readConfig() {
    state.cfg.inputs = clampInt(el.inputCount.value, 1, 8);
    state.cfg.hidden = clampInt(el.hiddenCount.value, 1, 8);
    state.cfg.outputs = clampInt(el.outputCount.value, 1, 6);
    state.cfg.eta = Number.isFinite(parseNum(el.learningRate.value)) ? parseNum(el.learningRate.value) : 0.5;
    state.cfg.alpha = Number.isFinite(parseNum(el.momentum.value)) ? parseNum(el.momentum.value) : 0;
    state.cfg.tolerance = Math.max(0.000001, Number.isFinite(parseNum(el.tolerance.value)) ? parseNum(el.tolerance.value) : 0.002);
    state.cfg.bias = el.useBias.checked;
  }

  function resetComputed() {
    state.z1 = Array(state.cfg.hidden).fill(NaN);
    state.o1 = Array(state.cfg.hidden).fill(NaN);
    state.z2 = Array(state.cfg.outputs).fill(NaN);
    state.o2 = Array(state.cfg.outputs).fill(NaN);
    state.e2 = Array(state.cfg.outputs).fill(NaN);
    state.d2 = Array(state.cfg.outputs).fill(NaN);
    state.r1 = Array(state.cfg.hidden).fill(NaN);
    state.d1 = Array(state.cfg.hidden).fill(NaN);
    state.nw1 = deepCopy(state.w1);
    state.nw2 = deepCopy(state.w2);
    state.steps = [];
    state.stepIndex = -1;
    state.started = false;
    state.work = {};
    state.resultAnswers = {};
    state.resultCorrect = {};
    state.revealed = {};
    state.focus = null;
    state.focusFromStep = true;
  }

  function buildFreshValues({ randomize = false } = {}) {
    if (!validateConfiguration()) return false;
    const hadStarted = state.started;
    readConfig();
    const { inputs, hidden, outputs, bias } = state.cfg;
    state.x = Array.from({ length: inputs }, (_, i) => state.x[i] ?? (i === 0 ? 1 : 0));
    state.t = Array.from({ length: outputs }, (_, k) => state.t[k] ?? (k === 0 ? 1 : 0));
    const rows1 = inputs + (bias ? 1 : 0);
    const rows2 = hidden + (bias ? 1 : 0);
    state.w1 = Array.from({ length: rows1 }, (_, i) => Array.from({ length: hidden }, (_, j) => randomize ? rand() : (state.w1[i]?.[j] ?? rand())));
    state.w2 = Array.from({ length: rows2 }, (_, j) => Array.from({ length: outputs }, (_, k) => randomize ? rand() : (state.w2[j]?.[k] ?? rand())));
    state.prevW1 = Array.from({ length: rows1 }, () => Array(hidden).fill(0));
    state.prevW2 = Array.from({ length: rows2 }, () => Array(outputs).fill(0));
    resetComputed();
    renderAll();
    if (hadStarted) {
      el.setupNotice.hidden = true;
      showSetupFeedback('Configuração atualizada. Comece uma nova prática quando estiver pronto.', 'info');
    }
    return true;
  }

  function renderAll() {
    renderValuesEditor();
    renderDiagram();
    renderStep();
    renderNeuronInspector();
    renderSummary();
    el.startBtn.textContent = 'Começar prática';
  }

  function renderValuesEditor() {
    const { inputs, hidden, outputs, bias } = state.cfg;
    let html = '';

    html += `<div class="value-section"><h3>Entradas x ${helpButton('inputValues')}</h3><div class="table-scroll"><table class="matrix"><tr>`;
    for (let i = 0; i < inputs; i++) html += `<th>x${i + 1}</th>`;
    html += `</tr><tr>`;
    for (let i = 0; i < inputs; i++) html += `<td><input data-kind="x" data-i="${i}" type="number" min="-1000000" max="1000000" step="any" value="${esc(state.x[i])}" aria-label="Entrada x${i + 1}"></td>`;
    html += `</tr></table></div></div>`;

    html += `<div class="value-section"><h3>Alvos t — um por saída ${helpButton('targets')}</h3><div class="table-scroll"><table class="matrix"><tr>`;
    for (let k = 0; k < outputs; k++) html += `<th>t${k + 1}</th>`;
    html += `</tr><tr>`;
    for (let k = 0; k < outputs; k++) html += `<td><input data-kind="t" data-i="${k}" type="number" min="0" max="1" step="any" value="${esc(state.t[k])}" aria-label="Alvo t${k + 1}"></td>`;
    html += `</tr></table></div></div>`;

    html += `<div class="value-section"><h3>w1 — entrada → ocultos ${helpButton('w1')}</h3><div class="table-scroll"><table class="matrix"><tr><th>origem</th>`;
    for (let j = 0; j < hidden; j++) html += `<th>h${j + 1}</th>`;
    html += `</tr>`;
    for (let i = 0; i < inputs + (bias ? 1 : 0); i++) {
      const source = i < inputs ? `x${i + 1}` : 'bias';
      html += `<tr><th>${source}</th>`;
      for (let j = 0; j < hidden; j++) html += `<td><input data-kind="w1" data-i="${i}" data-j="${j}" type="number" min="-1000000" max="1000000" step="any" value="${esc(state.w1[i][j])}" aria-label="Peso ${source} para h${j + 1}"></td>`;
      html += `</tr>`;
    }
    html += `</table></div></div>`;

    html += `<div class="value-section"><h3>w2 — ocultos → saídas ${helpButton('w2')}</h3><div class="table-scroll"><table class="matrix"><tr><th>origem</th>`;
    for (let k = 0; k < outputs; k++) html += `<th>y${k + 1}</th>`;
    html += `</tr>`;
    for (let j = 0; j < hidden + (bias ? 1 : 0); j++) {
      const source = j < hidden ? `h${j + 1}` : 'bias';
      html += `<tr><th>${source}</th>`;
      for (let k = 0; k < outputs; k++) html += `<td><input data-kind="w2" data-i="${j}" data-j="${k}" type="number" min="-1000000" max="1000000" step="any" value="${esc(state.w2[j][k])}" aria-label="Peso ${source} para y${k + 1}"></td>`;
      html += `</tr>`;
    }
    html += `</table></div></div>`;

    el.valuesEditor.innerHTML = html;
    el.valuesEditor.querySelectorAll('input').forEach(inp => inp.addEventListener('change', onValueEdit));
  }

  function onValueEdit(e) {
    const kind = e.target.dataset.kind;
    const i = Number(e.target.dataset.i);
    const j = Number(e.target.dataset.j);
    const v = parseNum(e.target.value);
    if (!validateDataInput(e.target, v)) return;
    if (kind === 'x') state.x[i] = v;
    if (kind === 't') state.t[i] = v;
    if (kind === 'w1') state.w1[i][j] = v;
    if (kind === 'w2') state.w2[i][j] = v;
    showSetupFeedback('', '');
    refreshAfterDataEdit();
  }

  function validateDataInput(input, value) {
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    const valid = Number.isFinite(value) && value >= min && value <= max;
    input.setAttribute('aria-invalid', String(!valid));
    if (!valid) showSetupFeedback(`Use um número entre ${fmt(min, 6)} e ${fmt(max, 6)}.`);
    return valid;
  }

  function refreshAfterDataEdit() {
    const hadStarted = state.started;
    resetComputed();
    renderAll();
    if (hadStarted) {
      el.setupNotice.hidden = true;
      el.setupFeedback.className = 'feedback info';
      el.setupFeedback.textContent = 'Dados atualizados. Comece uma nova prática quando estiver pronto.';
    }
  }

  function computeAll() {
    const { inputs, hidden, outputs, eta, alpha, bias } = state.cfg;
    const inVals = state.x.concat(bias ? [1] : []);
    const hidVals = [];

    for (let j = 0; j < hidden; j++) {
      let z = 0;
      for (let i = 0; i < inVals.length; i++) z += inVals[i] * state.w1[i][j];
      state.z1[j] = z;
      state.o1[j] = sigmoid(z);
      hidVals.push(state.o1[j]);
    }
    if (bias) hidVals.push(1);

    for (let k = 0; k < outputs; k++) {
      let z = 0;
      for (let j = 0; j < hidVals.length; j++) z += hidVals[j] * state.w2[j][k];
      state.z2[k] = z;
      state.o2[k] = sigmoid(z);
      state.e2[k] = state.t[k] - state.o2[k];
      state.d2[k] = state.e2[k] * state.o2[k] * (1 - state.o2[k]);
    }

    for (let j = 0; j < hidden; j++) {
      let returned = 0;
      for (let k = 0; k < outputs; k++) returned += state.d2[k] * state.w2[j][k];
      state.r1[j] = returned;
      state.d1[j] = returned * state.o1[j] * (1 - state.o1[j]);
    }

    state.nw2 = deepCopy(state.w2);
    for (let j = 0; j < hidVals.length; j++) {
      for (let k = 0; k < outputs; k++) {
        const prev = state.prevW2[j]?.[k] ?? 0;
        state.nw2[j][k] = state.w2[j][k] + eta * state.d2[k] * hidVals[j] + alpha * prev;
      }
    }

    state.nw1 = deepCopy(state.w1);
    for (let i = 0; i < inVals.length; i++) {
      for (let j = 0; j < hidden; j++) {
        const prev = state.prevW1[i]?.[j] ?? 0;
        state.nw1[i][j] = state.w1[i][j] + eta * state.d1[j] * inVals[i] + alpha * prev;
      }
    }
  }

  function createSteps() {
    const { inputs, hidden, outputs, bias } = state.cfg;
    const steps = [];
    for (let j = 0; j < hidden; j++) steps.push({ type: 'z1', j, title: `Soma que chega em h${j + 1}` });
    for (let j = 0; j < hidden; j++) steps.push({ type: 'o1', j, title: `Ativação de h${j + 1}` });
    for (let k = 0; k < outputs; k++) steps.push({ type: 'z2', k, title: `Soma que chega em y${k + 1}` });
    for (let k = 0; k < outputs; k++) steps.push({ type: 'o2', k, title: `Ativação de y${k + 1}` });
    for (let k = 0; k < outputs; k++) steps.push({ type: 'e2', k, title: `Erro simples de y${k + 1}` });
    for (let k = 0; k < outputs; k++) steps.push({ type: 'd2', k, title: `Delta da saída y${k + 1}` });
    for (let j = 0; j < hidden; j++) steps.push({ type: 'r1', j, title: `Erro que volta para h${j + 1}` });
    for (let j = 0; j < hidden; j++) steps.push({ type: 'd1', j, title: `Delta de h${j + 1}` });
    for (let k = 0; k < outputs; k++) {
      for (let j = 0; j < hidden + (bias ? 1 : 0); j++) steps.push({ type: 'nw2', j, k, title: `Corrigir ${j < hidden ? `h${j + 1}` : 'bias'} → y${k + 1}` });
    }
    for (let j = 0; j < hidden; j++) {
      for (let i = 0; i < inputs + (bias ? 1 : 0); i++) steps.push({ type: 'nw1', i, j, title: `Corrigir ${i < inputs ? `x${i + 1}` : 'bias'} → h${j + 1}` });
    }
    return steps;
  }

  function startExercise() {
    if (!validateConfiguration() || !syncValuesFromEditor()) return;
    readConfig();
    state.prevW1 = Array.from({ length: state.w1.length }, () => Array(state.cfg.hidden).fill(0));
    state.prevW2 = Array.from({ length: state.w2.length }, () => Array(state.cfg.outputs).fill(0));
    computeAll();
    state.steps = createSteps();
    state.stepIndex = 0;
    state.started = true;
    state.work = {};
    state.resultAnswers = {};
    state.resultCorrect = {};
    state.revealed = {};
    state.focusFromStep = true;
    syncFocusToStep();
    renderAll();
    el.setupNotice.hidden = true;
    el.setupFeedback.textContent = '';
    setPanel('practicePanel');
    document.body.classList.remove('sidebar-open');
  }

  function resetProgress() {
    if (!state.started) return;
    if (Object.keys(state.work).length && !window.confirm('Apagar as respostas e voltar à primeira etapa?')) return;
    state.stepIndex = 0;
    state.work = {};
    state.resultAnswers = {};
    state.resultCorrect = {};
    state.revealed = {};
    state.focusFromStep = true;
    syncFocusToStep();
    renderStep();
    renderValuesEditor();
    renderDiagram();
    renderNeuronInspector();
    renderSummary();
  }

  function syncValuesFromEditor() {
    let valid = true;
    el.valuesEditor.querySelectorAll('input').forEach(inp => {
      const kind = inp.dataset.kind, i = Number(inp.dataset.i), j = Number(inp.dataset.j), v = parseNum(inp.value);
      if (!validateDataInput(inp, v)) { valid = false; return; }
      if (kind === 'x') state.x[i] = v;
      if (kind === 't') state.t[i] = v;
      if (kind === 'w1') state.w1[i][j] = v;
      if (kind === 'w2') state.w2[i][j] = v;
    });
    if (valid) showSetupFeedback('', '');
    return valid;
  }

  function currentStep() { return state.started ? state.steps[state.stepIndex] : null; }
  function stepKey(step = currentStep(), idx = state.stepIndex) { return step ? `${idx}:${step.type}` : 'none'; }
  function resultIdFor(step) {
    if (!step) return '';
    if (['z1', 'o1', 'r1', 'd1'].includes(step.type)) return `${step.type}:${step.j}`;
    if (['z2', 'o2', 'e2', 'd2'].includes(step.type)) return `${step.type}:${step.k}`;
    if (step.type === 'nw1') return `nw1:${step.i}:${step.j}`;
    if (step.type === 'nw2') return `nw2:${step.j}:${step.k}`;
    return '';
  }

  function phaseName(type) {
    if (['z1','o1','z2','o2'].includes(type)) return 'Forward propagation';
    if (['e2','d2','r1','d1'].includes(type)) return 'Backpropagation';
    if (['nw2','nw1'].includes(type)) return 'Atualização dos pesos';
    return 'Exercício';
  }

  function resultFor(step) {
    if (!step) return NaN;
    if (step.type === 'z1') return state.z1[step.j];
    if (step.type === 'o1') return state.o1[step.j];
    if (step.type === 'z2') return state.z2[step.k];
    if (step.type === 'o2') return state.o2[step.k];
    if (step.type === 'e2') return state.e2[step.k];
    if (step.type === 'd2') return state.d2[step.k];
    if (step.type === 'r1') return state.r1[step.j];
    if (step.type === 'd1') return state.d1[step.j];
    if (step.type === 'nw2') return state.nw2[step.j][step.k];
    if (step.type === 'nw1') return state.nw1[step.i][step.j];
    return NaN;
  }

  function specFor(step) {
    if (!step) return null;
    const { inputs, hidden, outputs, eta, alpha, bias } = state.cfg;
    const inVals = state.x.concat(bias ? [1] : []);
    const learned = (id) => state.work[id];
    const hidVals = Array.from({ length: hidden }, (_, j) => learned(`o1:${j}`)).concat(bias ? [1] : []);
    const vars = [];
    const subscript = (n) => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
    const x = (i) => `x${subscript(i + 1)}`;
    const h = (j) => `h${subscript(j + 1)}`;
    const y = (k) => `y${subscript(k + 1)}`;
    const zH = (j) => `z(${h(j)})`;
    const zY = (k) => `z(${y(k)})`;
    const oH = (j) => `O(${h(j)})`;
    const oY = (k) => `O(${y(k)})`;
    const dH = (j) => `δ(${h(j)})`;
    const dY = (k) => `δ(${y(k)})`;
    const w1 = (i, j) => `w(${i < inputs ? x(i) : 'b'}→${h(j)})`;
    const w2 = (j, k) => `w(${j < hidden ? h(j) : 'b'}→${y(k)})`;
    const value = (n) => Number.isFinite(n) ? fmt(n, 8) : '?';
    let formula = '', substitution = '', context = '', code = '', resultSymbol = '';

    const add = (id, symbol, value, desc) => vars.push({ id, symbol, value, desc });

    if (step.type === 'z1') {
      const j = step.j;
      const terms = [];
      const numbers = [];
      for (let i = 0; i < inVals.length; i++) {
        const source = i < inputs ? x(i) : 'b';
        add(`a${i}`, source, inVals[i], i < inputs ? `entrada ${x(i)}` : 'bias fixo (= 1)');
        add(`w${i}`, w1(i, j), state.w1[i][j], 'peso desta conexão');
        terms.push(`${source}·${w1(i, j)}`);
        numbers.push(`${value(inVals[i])}·${value(state.w1[i][j])}`);
      }
      resultSymbol = zH(j);
      formula = `${resultSymbol} = ${terms.join(' + ')}`;
      substitution = `${resultSymbol} = ${numbers.join(' + ')}`;
      context = `Multiplique cada entrada pelo peso que chega em <strong>${h(j)}</strong> e some os termos.`;
      code = `I1[j] = 0.0;\nfor (i = 0; i < entradas_com_bias; i++)\n    I1[j] += O0[i] * w1[i][j];`;
    }

    if (step.type === 'o1') {
      const z = learned(`z1:${step.j}`);
      add('z', zH(step.j), z, 'soma que você calculou na etapa anterior');
      resultSymbol = oH(step.j);
      formula = `${resultSymbol} = σ(${zH(step.j)}) = 1 / (1 + e^(−${zH(step.j)}))`;
      substitution = `${resultSymbol} = σ(${value(z)}) = 1 / (1 + e^(−${value(z)}))`;
      context = `Aplique a <strong>sigmoide</strong> à soma de ${h(step.j)}.`;
      code = `O1[j] = 1.0 / (1.0 + exp(-I1[j]));`;
    }

    if (step.type === 'z2') {
      const k = step.k;
      const terms = [];
      const numbers = [];
      for (let j = 0; j < hidVals.length; j++) {
        const source = j < hidden ? oH(j) : 'b';
        add(`a${j}`, source, hidVals[j], j < hidden ? `resultado de ${oH(j)}` : 'bias fixo (= 1)');
        add(`w${j}`, w2(j, k), state.w2[j][k], 'peso desta conexão');
        terms.push(`${source}·${w2(j, k)}`);
        numbers.push(`${value(hidVals[j])}·${value(state.w2[j][k])}`);
      }
      resultSymbol = zY(k);
      formula = `${resultSymbol} = ${terms.join(' + ')}`;
      substitution = `${resultSymbol} = ${numbers.join(' + ')}`;
      context = `Agora use as <strong>saídas dos neurônios ocultos</strong> e o bias para calcular ${y(k)}.`;
      code = `I2[k] = 0.0;\nfor (j = 0; j < ocultos_com_bias; j++)\n    I2[k] += O1[j] * w2[j][k];`;
    }

    if (step.type === 'o2') {
      const z = learned(`z2:${step.k}`);
      add('z', zY(step.k), z, 'soma que você calculou na etapa anterior');
      resultSymbol = oY(step.k);
      formula = `${resultSymbol} = σ(${zY(step.k)}) = 1 / (1 + e^(−${zY(step.k)}))`;
      substitution = `${resultSymbol} = σ(${value(z)}) = 1 / (1 + e^(−${value(z)}))`;
      context = `Aplique a sigmoide para obter a saída final ${y(step.k)}.`;
      code = `O2[k] = 1.0 / (1.0 + exp(-I2[k]));`;
    }

    if (step.type === 'e2') {
      const output = learned(`o2:${step.k}`);
      add('t', `t${subscript(step.k + 1)}`, state.t[step.k], 'alvo: resposta correta conhecida');
      add('o', oY(step.k), output, 'saída que você calculou');
      resultSymbol = `e(${y(step.k)})`;
      formula = `${resultSymbol} = t${subscript(step.k + 1)} − ${oY(step.k)}`;
      substitution = `${resultSymbol} = ${value(state.t[step.k])} − ${value(output)}`;
      context = `Este é apenas o <strong>erro simples</strong>. Ainda não é o delta.`;
      code = `erro = t[k] - O2[k];`;
    }

    if (step.type === 'd2') {
      const error = learned(`e2:${step.k}`), output = learned(`o2:${step.k}`);
      add('e', `e(${y(step.k)})`, error, 'erro simples que você calculou');
      add('o', oY(step.k), output, 'saída que você calculou');
      resultSymbol = dY(step.k);
      formula = `${resultSymbol} = e(${y(step.k)}) · ${oY(step.k)} · (1 − ${oY(step.k)})`;
      substitution = `${resultSymbol} = ${value(error)} · ${value(output)} · (1 − ${value(output)})`;
      context = `O delta da saída junta o erro simples com a <strong>derivada da sigmoide</strong>.`;
      code = `d2[k] = (t[k] - O2[k]) * O2[k] * (1.0 - O2[k]);`;
    }

    if (step.type === 'r1') {
      const j = step.j;
      const terms = [];
      const numbers = [];
      for (let k = 0; k < outputs; k++) {
        const delta = learned(`d2:${k}`);
        add(`d${k}`, dY(k), delta, `delta que você calculou para ${y(k)}`);
        add(`w${k}`, w2(j, k), state.w2[j][k], 'peso atual, ainda não corrigido nesta amostra');
        terms.push(`${dY(k)}·${w2(j, k)}`);
        numbers.push(`${value(delta)}·${value(state.w2[j][k])}`);
      }
      resultSymbol = `r(${h(j)})`;
      formula = `${resultSymbol} = ${terms.join(' + ')}`;
      substitution = `${resultSymbol} = ${numbers.join(' + ')}`;
      context = `Calcule somente <strong>quanto erro volta</strong> das saídas para ${h(j)}. Os pesos ainda são os usados no forward.`;
      code = `retorno = 0.0;\nfor (k = 0; k < saidas; k++)\n    retorno += d2[k] * w2[j][k];`;
    }

    if (step.type === 'd1') {
      const returned = learned(`r1:${step.j}`), output = learned(`o1:${step.j}`);
      add('r', `r(${h(step.j)})`, returned, 'erro que voltou pelas conexões de saída');
      add('o', oH(step.j), output, 'saída que você calculou');
      resultSymbol = dH(step.j);
      formula = `${resultSymbol} = r(${h(step.j)}) · ${oH(step.j)} · (1 − ${oH(step.j)})`;
      substitution = `${resultSymbol} = ${value(returned)} · ${value(output)} · (1 − ${value(output)})`;
      context = `Agora transforme o erro que voltou no <strong>delta final do neurônio oculto</strong>.`;
      code = `d1[j] = O1[j] * (1.0 - O1[j]) * retorno;`;
    }

    if (step.type === 'nw2') {
      const source = step.j < hidden ? oH(step.j) : 'b';
      const delta = learned(`d2:${step.k}`), activation = hidVals[step.j];
      add('w', 'w_atual', state.w2[step.j][step.k], 'peso atual da conexão');
      add('eta', 'η', eta, 'taxa de aprendizado');
      add('d', dY(step.k), delta, 'delta que você calculou para o destino');
      add('a', source, activation, step.j < hidden ? `resultado de ${oH(step.j)}` : 'bias fixo (= 1)');
      resultSymbol = `w′(${step.j < hidden ? h(step.j) : 'b'}→${y(step.k)})`;
      if (alpha !== 0) {
        add('alpha', 'α', alpha, 'momentum');
        add('prev', 'Δw_anterior', state.prevW2[step.j]?.[step.k] ?? 0, 'variação anterior desse peso');
        formula = `${resultSymbol} = w + η·${dY(step.k)}·${source} + α·Δw`;
        substitution = `${resultSymbol} = ${value(state.w2[step.j][step.k])} + ${value(eta)}·${value(delta)}·${value(activation)} + ${value(alpha)}·${value(state.prevW2[step.j]?.[step.k] ?? 0)}`;
      } else {
        formula = `${resultSymbol} = w + η·${dY(step.k)}·${source}`;
        substitution = `${resultSymbol} = ${value(state.w2[step.j][step.k])} + ${value(eta)}·${value(delta)}·${value(activation)}`;
      }
      context = `Corrija o peso <strong>${step.j < hidden ? h(step.j) : 'bias'} → ${y(step.k)}</strong>.`;
      code = `nw2[j][k] = w2[j][k] + eta * d2[k] * O1[j] + alpha * vw2[j][k];`;
    }

    if (step.type === 'nw1') {
      const source = step.i < inputs ? x(step.i) : 'b';
      const delta = learned(`d1:${step.j}`), activation = inVals[step.i];
      add('w', 'w_atual', state.w1[step.i][step.j], 'peso atual da conexão');
      add('eta', 'η', eta, 'taxa de aprendizado');
      add('d', dH(step.j), delta, 'delta que você calculou para o destino');
      add('a', source, activation, step.i < inputs ? `entrada ${x(step.i)}` : 'bias fixo (= 1)');
      resultSymbol = `w′(${step.i < inputs ? x(step.i) : 'b'}→${h(step.j)})`;
      if (alpha !== 0) {
        add('alpha', 'α', alpha, 'momentum');
        add('prev', 'Δw_anterior', state.prevW1[step.i]?.[step.j] ?? 0, 'variação anterior desse peso');
        formula = `${resultSymbol} = w + η·${dH(step.j)}·${source} + α·Δw`;
        substitution = `${resultSymbol} = ${value(state.w1[step.i][step.j])} + ${value(eta)}·${value(delta)}·${value(activation)} + ${value(alpha)}·${value(state.prevW1[step.i]?.[step.j] ?? 0)}`;
      } else {
        formula = `${resultSymbol} = w + η·${dH(step.j)}·${source}`;
        substitution = `${resultSymbol} = ${value(state.w1[step.i][step.j])} + ${value(eta)}·${value(delta)}·${value(activation)}`;
      }
      context = `Corrija o peso <strong>${step.i < inputs ? x(step.i) : 'bias'} → ${h(step.j)}</strong>.`;
      code = `nw1[i][j] = w1[i][j] + eta * d1[j] * O0[i] + alpha * vw1[i][j];`;
    }

    return { vars, formula, substitution, context, code, result: resultFor(step), resultSymbol };
  }

  function renderStep() {
    const step = currentStep();
    if (!step) {
      el.stepTitle.textContent = 'Configure a rede para começar';
      el.stepCounter.textContent = '—';
      el.stepContext.innerHTML = 'Revise os dados na <strong>Preparação</strong> e selecione <strong>Começar prática</strong>.';
      el.formulaStatic.textContent = '—';
      el.formulaValues.textContent = '—';
      el.formulaLegend.innerHTML = '';
      el.codeSnippet.textContent = '—';
      el.progressBadge.textContent = '0 / 0';
      el.progressBar.style.width = '0%';
      el.phaseLabel.textContent = 'Aguardando início';
      el.resultPrompt.textContent = 'Insira o resultado calculado.';
      el.answerInput.value = '';
      el.answerInput.disabled = true;
      el.checkBtn.disabled = true;
      el.prevBtn.disabled = true;
      el.nextBtn.disabled = true;
      el.hintBtn.disabled = true;
      el.revealBtn.disabled = true;
      el.resultBlock.classList.add('locked');
      el.feedback.textContent = '';
      return;
    }

    const spec = specFor(step);
    const key = stepKey();
    const resultOk = !!state.resultCorrect[key] || !!state.revealed[key];

    el.stepTitle.textContent = step.title;
    el.stepCounter.textContent = `${state.stepIndex + 1}/${state.steps.length}`;
    el.stepContext.innerHTML = spec.context;
    el.formulaStatic.textContent = spec.formula;
    el.formulaValues.textContent = spec.substitution;
    el.formulaLegend.innerHTML = spec.vars.map(v => `<div><strong>${esc(v.symbol)}</strong> = ${esc(Number.isFinite(v.value) ? fmt(v.value, 8) : '?')}</div><div class="formula-source">${esc(v.desc)}</div>`).join('');
    el.codeSnippet.textContent = spec.code;
    el.resultPrompt.textContent = `Calcule ${spec.resultSymbol} e insira somente o resultado.`;
    el.resultBlock.classList.remove('locked');
    el.answerInput.disabled = resultOk;
    el.checkBtn.disabled = resultOk;
    el.hintBtn.disabled = resultOk;
    el.revealBtn.disabled = resultOk;
    el.answerInput.value = state.resultAnswers[key] ?? '';
    el.feedback.className = 'feedback';
    el.feedback.textContent = resultOk ? `Etapa concluída. ${spec.resultSymbol} = ${fmt(state.work[resultIdFor(step)] ?? spec.result, 8)}.` : '';

    el.prevBtn.disabled = state.stepIndex === 0;
    el.nextBtn.disabled = !resultOk || state.stepIndex === state.steps.length - 1;
    const done = new Set([
      ...Object.entries(state.resultCorrect).filter(([,v]) => v).map(([k]) => k),
      ...Object.entries(state.revealed).filter(([,v]) => v).map(([k]) => k)
    ]).size;
    const pct = state.steps.length ? Math.min(100, (done / state.steps.length) * 100) : 0;
    el.progressBadge.textContent = `${Math.min(done, state.steps.length)} / ${state.steps.length}`;
    el.progressBar.style.width = `${pct}%`;
    el.phaseLabel.textContent = done === state.steps.length ? 'Prática concluída' : phaseName(step.type);
  }

  function numericClose(user, expected) {
    if (!Number.isFinite(user) || !Number.isFinite(expected)) return false;
    const tol = Math.max(state.cfg.tolerance, Math.abs(expected) * state.cfg.tolerance);
    return Math.abs(user - expected) <= tol;
  }


  function checkResult() {
    const step = currentStep();
    if (!step) return;
    const key = stepKey(), spec = specFor(step), user = parseNum(el.answerInput.value);
    state.resultAnswers[key] = el.answerInput.value;
    const ok = numericClose(user, spec.result);
    state.resultCorrect[key] = ok;
    if (ok) {
      state.work[resultIdFor(step)] = spec.result;
      el.feedback.className = 'feedback ok';
      el.feedback.textContent = `Correto. ${spec.resultSymbol} = ${fmt(spec.result, 8)}.`;
      el.nextBtn.disabled = state.stepIndex === state.steps.length - 1;
      renderStep();
      renderValuesEditor();
      renderDiagram();
      renderSummary();
    } else {
      el.feedback.className = 'feedback bad';
      el.feedback.textContent = 'Ainda não. Confira a substituição acima ou abra uma dica.';
    }
  }

  function revealStep() {
    const step = currentStep();
    if (!step) return;
    const key = stepKey(), spec = specFor(step);
    state.resultAnswers[key] = fmt(spec.result, 8);
    state.resultCorrect[key] = true;
    state.revealed[key] = true;
    state.work[resultIdFor(step)] = spec.result;
    renderStep();
    renderValuesEditor();
    renderDiagram();
    renderSummary();
  }

  function showHint() {
    const step = currentStep();
    if (!step) return;
    const hints = {
      z1: 'Faça cada multiplicação entrada × peso separadamente e só depois some.',
      o1: 'Use o z do neurônio dentro da sigmoide. Cuidado com o sinal em e^(−z).',
      z2: 'As entradas agora são O_h1, O_h2... e não x1, x2.',
      o2: 'É a mesma função de ativação sigmoide usada na camada oculta.',
      e2: 'Erro simples = alvo − saída. Não aplique ainda O(1−O).',
      d2: 'Use o erro simples já calculado e multiplique por O(1−O).',
      r1: 'Aqui você só traz o erro de volta: delta da saída × peso w2; some se houver várias saídas.',
      d1: 'Pegue o erro que voltou e só então multiplique pela derivada O_h(1−O_h).',
      nw2: 'Use o delta da saída de destino e a saída do neurônio oculto de origem.',
      nw1: 'Use o delta do neurônio oculto de destino e a entrada x (ou bias) de origem.'
    };
    el.feedback.className = 'feedback info';
    el.feedback.textContent = hints[step.type] || 'Use a substituição automática e resolva a fórmula por partes.';
  }

  function moveStep(delta) {
    if (!state.started) return;
    if (delta > 0) {
      const key = stepKey();
      if (!state.resultCorrect[key] && !state.revealed[key]) return;
    }
    state.stepIndex = Math.max(0, Math.min(state.steps.length - 1, state.stepIndex + delta));
    syncFocusToStep();
    renderStep();
    renderDiagram();
    renderNeuronInspector();
  }

  function stepFocus(step) {
    if (!step) return null;
    if (step.type === 'z1' || step.type === 'o1') return { kind: 'hiddenIn', index: step.j, back: false };
    if (step.type === 'r1' || step.type === 'd1') return { kind: 'hiddenBack', index: step.j, back: true };
    if (['z2','o2','e2','d2'].includes(step.type)) return { kind: 'output', index: step.k, back: ['e2','d2'].includes(step.type) };
    if (step.type === 'nw2') return { kind: 'edgeW2', j: step.j, k: step.k, back: true };
    if (step.type === 'nw1') return { kind: 'edgeW1', i: step.i, j: step.j, back: true };
    return null;
  }

  function syncFocusToStep() {
    state.focusFromStep = true;
    state.focus = stepFocus(currentStep());
  }

  function focusSets() {
    const { inputs, hidden, outputs, bias } = state.cfg;
    const nodes = new Set(), edges = new Set();
    const f = state.focus;
    if (!f) return { nodes, edges, active: false, back: false };
    const addNode = (k) => nodes.add(k);
    const addEdge = (k) => edges.add(k);

    if (f.kind === 'input') {
      addNode(`in:${f.index}`);
      for (let j = 0; j < hidden; j++) { addNode(`h:${j}`); addEdge(`w1:${f.index}:${j}`); }
    }
    if (f.kind === 'biasInput') {
      addNode(`in:${inputs}`);
      for (let j = 0; j < hidden; j++) { addNode(`h:${j}`); addEdge(`w1:${inputs}:${j}`); }
    }
    if (f.kind === 'hidden' || f.kind === 'hiddenIn' || f.kind === 'hiddenBack') {
      addNode(`h:${f.index}`);
      if (f.kind === 'hidden' || f.kind === 'hiddenIn') {
        for (let i = 0; i < inputs + (bias ? 1 : 0); i++) { addNode(`in:${i}`); addEdge(`w1:${i}:${f.index}`); }
      }
      if (f.kind === 'hidden' || f.kind === 'hiddenBack') {
        for (let k = 0; k < outputs; k++) { addNode(`out:${k}`); addEdge(`w2:${f.index}:${k}`); }
      }
    }
    if (f.kind === 'biasHidden') {
      addNode(`h:${hidden}`);
      for (let k = 0; k < outputs; k++) { addNode(`out:${k}`); addEdge(`w2:${hidden}:${k}`); }
    }
    if (f.kind === 'output') {
      addNode(`out:${f.index}`);
      for (let j = 0; j < hidden + (bias ? 1 : 0); j++) { addNode(`h:${j}`); addEdge(`w2:${j}:${f.index}`); }
    }
    if (f.kind === 'edgeW1') { addNode(`in:${f.i}`); addNode(`h:${f.j}`); addEdge(`w1:${f.i}:${f.j}`); }
    if (f.kind === 'edgeW2') { addNode(`h:${f.j}`); addNode(`out:${f.k}`); addEdge(`w2:${f.j}:${f.k}`); }
    return { nodes, edges, active: true, back: !!f.back };
  }

  function nodeDisplayValue(kind, index) {
    if (kind === 'in') {
      if (index < state.cfg.inputs) return fmt(state.x[index], 4);
      return '1';
    }
    if (kind === 'h') {
      if (index === state.cfg.hidden && state.cfg.bias) return '1';
      if (!state.started) return '?';
      const idx = state.steps.findIndex(s => s.type === 'o1' && s.j === index);
      if (idx >= 0 && (state.resultCorrect[`${idx}:o1`] || state.revealed[`${idx}:o1`])) return fmt(state.o1[index], 4);
      return '?';
    }
    if (kind === 'out') {
      if (!state.started) return '?';
      const idx = state.steps.findIndex(s => s.type === 'o2' && s.k === index);
      if (idx >= 0 && (state.resultCorrect[`${idx}:o2`] || state.revealed[`${idx}:o2`])) return fmt(state.o2[index], 4);
      return '?';
    }
    return '?';
  }

  function renderDiagram() {
    const { inputs, hidden, outputs, bias } = state.cfg;
    const inCount = inputs + (bias ? 1 : 0), hidCount = hidden + (bias ? 1 : 0);
    const maxCount = Math.max(inCount, hidCount, outputs);
    const W = 1000, H = Math.max(610, 160 + maxCount * 92);
    const xPos = [140, 500, 860];
    const ys = (count) => {
      const top = 110, bottom = H - 85;
      if (count === 1) return [(top + bottom) / 2];
      return Array.from({ length: count }, (_, i) => top + i * ((bottom - top) / (count - 1)));
    };
    const yi = ys(inCount), yh = ys(hidCount), yo = ys(outputs);
    const sets = focusSets();
    const edgeClass = (key) => sets.active ? (sets.edges.has(key) ? (sets.back ? 'edge lit-back' : 'edge lit-forward') : 'edge dimmed') : 'edge';
    const nodeClass = (key) => sets.active ? (sets.nodes.has(key) ? 'node-group lit' : 'node-group dimmed') : 'node-group';
    const labelClass = (key) => sets.active && !sets.edges.has(key) ? 'weight-label dimmed' : 'weight-label';
    const weightMode = el.weightLabelMode.value;
    const showLabel = (key) => weightMode === 'always' || (weightMode === 'focus' && sets.active && sets.edges.has(key));

    let svg = `<svg class="network-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rede neural interativa">`;
    svg += `<text class="layer-title" x="${xPos[0]}" y="48" text-anchor="middle">Entradas</text>`;
    svg += `<text class="layer-title" x="${xPos[1]}" y="48" text-anchor="middle">Camada oculta</text>`;
    svg += `<text class="layer-title" x="${xPos[2]}" y="48" text-anchor="middle">Saídas</text>`;

    for (let i = 0; i < inCount; i++) {
      for (let j = 0; j < hidden; j++) {
        const key = `w1:${i}:${j}`;
        const mx = (xPos[0] + xPos[1]) / 2, my = (yi[i] + yh[j]) / 2;
        svg += `<line class="${edgeClass(key)}" x1="${xPos[0] + 31}" y1="${yi[i]}" x2="${xPos[1] - 31}" y2="${yh[j]}"/>`;
        svg += `<line class="edge-hit" data-edge="${key}" x1="${xPos[0] + 31}" y1="${yi[i]}" x2="${xPos[1] - 31}" y2="${yh[j]}"><title>w1 ${i < inputs ? `x${i+1}` : 'bias'} → h${j+1} = ${fmt(state.w1[i][j], 6)}</title></line>`;
        if (showLabel(key)) svg += `<text class="${labelClass(key)}" x="${mx}" y="${my - 5}" text-anchor="middle">${fmt(state.w1[i][j], 3)}</text>`;
      }
    }
    for (let j = 0; j < hidCount; j++) {
      for (let k = 0; k < outputs; k++) {
        const key = `w2:${j}:${k}`;
        const mx = (xPos[1] + xPos[2]) / 2, my = (yh[j] + yo[k]) / 2;
        svg += `<line class="${edgeClass(key)}" x1="${xPos[1] + 31}" y1="${yh[j]}" x2="${xPos[2] - 31}" y2="${yo[k]}"/>`;
        svg += `<line class="edge-hit" data-edge="${key}" x1="${xPos[1] + 31}" y1="${yh[j]}" x2="${xPos[2] - 31}" y2="${yo[k]}"><title>w2 ${j < hidden ? `h${j+1}` : 'bias'} → y${k+1} = ${fmt(state.w2[j][k], 6)}</title></line>`;
        if (showLabel(key)) svg += `<text class="${labelClass(key)}" x="${mx}" y="${my - 5}" text-anchor="middle">${fmt(state.w2[j][k], 3)}</text>`;
      }
    }

    for (let i = 0; i < inCount; i++) {
      const biasNode = bias && i === inputs;
      const key = `in:${i}`;
      svg += nodeSvg({ key, cx:xPos[0], cy:yi[i], label:biasNode ? 'bias' : `x${i+1}`, value:nodeDisplayValue('in', i), cls:biasNode ? 'node-bias' : 'node-input', group:nodeClass(key), kind:biasNode ? 'biasInput' : 'input', index:i });
    }
    for (let j = 0; j < hidCount; j++) {
      const biasNode = bias && j === hidden;
      const key = `h:${j}`;
      svg += nodeSvg({ key, cx:xPos[1], cy:yh[j], label:biasNode ? 'bias' : `h${j+1}`, value:nodeDisplayValue('h', j), cls:biasNode ? 'node-bias' : 'node-hidden', group:nodeClass(key), kind:biasNode ? 'biasHidden' : 'hidden', index:j });
    }
    for (let k = 0; k < outputs; k++) {
      const key = `out:${k}`;
      svg += nodeSvg({ key, cx:xPos[2], cy:yo[k], label:`y${k+1}`, value:nodeDisplayValue('out', k), cls:'node-output', group:nodeClass(key), kind:'output', index:k });
      svg += `<text class="target-label" x="${xPos[2]}" y="${yo[k] + 48}" text-anchor="middle">t${k + 1} = ${fmt(state.t[k], 4)}</text>`;
    }
    svg += `</svg>`;
    el.networkDiagram.innerHTML = svg;

    el.networkDiagram.querySelectorAll('.node-group').forEach(g => {
      const inspectNode = () => {
        state.focusFromStep = false;
        state.focus = { kind: g.dataset.kind, index: Number(g.dataset.index), back: false };
        renderDiagram();
        renderNeuronInspector();
      };
      g.addEventListener('click', inspectNode);
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inspectNode();
        }
      });
    });
    updateFocusInfo();
  }

  function nodeSvg({cx, cy, label, value, cls, group, kind, index}) {
    const accessibleLabel = `${label}: ${value}`;
    return `<g class="${group}" data-kind="${kind}" data-index="${index}" role="button" tabindex="0" aria-label="Inspecionar ${esc(accessibleLabel)}"><circle class="node-ring ${cls}" cx="${cx}" cy="${cy}" r="29"/><text class="node-text" x="${cx}" y="${cy - 2}" text-anchor="middle">${esc(label)}</text><text class="node-value" x="${cx}" y="${cy + 14}" text-anchor="middle">${esc(value)}</text></g>`;
  }

  function updateFocusInfo() {
    const f = state.focus;
    if (!f) { el.focusInfo.textContent = 'Nenhum nó selecionado.'; return; }
    if (f.kind === 'input') el.focusInfo.textContent = `Foco em x${f.index + 1}: conexões para todos os neurônios ocultos.`;
    else if (f.kind === 'biasInput') el.focusInfo.textContent = 'Foco no bias de entrada.';
    else if (f.kind === 'hidden') el.focusInfo.textContent = `Foco em h${f.index + 1}: entradas que chegam e saídas que ele influencia.`;
    else if (f.kind === 'hiddenIn') el.focusInfo.textContent = `Foco em h${f.index + 1}: conexões w1 usadas no forward.`;
    else if (f.kind === 'hiddenBack') el.focusInfo.textContent = `Foco em h${f.index + 1}: erro retornando pelas conexões w2.`;
    else if (f.kind === 'biasHidden') el.focusInfo.textContent = 'Foco no bias da camada oculta.';
    else if (f.kind === 'output') el.focusInfo.textContent = `Foco em y${f.index + 1}: conexões que chegam à saída.`;
    else el.focusInfo.textContent = 'Foco na conexão usada no cálculo atual.';
  }

  function renderNeuronInspector() {
    const f = state.focus;
    el.neuronInspector.hidden = state.started && state.focusFromStep;
    if (el.neuronInspector.hidden) return;
    if (!f) {
      el.neuronInspector.innerHTML = `<div class="inspector-empty"><span class="mini-title">Inspetor do neurônio</span><p>Selecione um nó no diagrama para consultar sua equação e seus valores.</p></div>`;
      return;
    }

    const { inputs, hidden, bias } = state.cfg;
    let title = '', description = '', formula = '', values = [], computed = '';
    const inputTerms = (j) => Array.from({ length: inputs + (bias ? 1 : 0) }, (_, i) => `${i < inputs ? `x${i + 1}` : 'b'}·w1(${i < inputs ? `x${i + 1}` : 'b'}→h${j + 1})`).join(' + ');
    const hiddenTerms = (k) => Array.from({ length: hidden + (bias ? 1 : 0) }, (_, j) => `${j < hidden ? `O_h${j + 1}` : 'b'}·w2(${j < hidden ? `h${j + 1}` : 'b'}→y${k + 1})`).join(' + ');

    if (f.kind === 'input') {
      title = `Entrada x${f.index + 1}`;
      description = 'Esta entrada participa da soma de todos os neurônios ocultos.';
      formula = `Cada h recebe: z_h = ${inputTerms(0).replace(/h1/g, 'h')}. A contribuição de x${f.index + 1} em cada soma é x${f.index + 1}·w1(x${f.index + 1}→h).`;
      values.push(`x${f.index + 1} = ${fmt(state.x[f.index], 6)}`);
      for (let j = 0; j < hidden; j++) values.push(`w1(x${f.index + 1} → h${j + 1}) = ${fmt(state.w1[f.index][j], 6)}`);
    } else if (f.kind === 'biasInput') {
      title = 'Bias de entrada';
      description = 'O bias b = 1 é multiplicado por um peso diferente em cada neurônio oculto.';
      formula = `z_h = … + b·w1(b→h), com b = 1.`;
      for (let j = 0; j < hidden; j++) values.push(`w1(b → h${j + 1}) = ${fmt(state.w1[inputs][j], 6)}`);
    } else if (f.kind === 'hidden' || f.kind === 'hiddenIn' || f.kind === 'hiddenBack') {
      const j = f.index;
      title = `Neurônio oculto h${j + 1}`;
      description = 'A ativação é a sigmoide da soma ponderada que chega a este neurônio.';
      formula = `z_h${j + 1} = ${inputTerms(j)}; O_h${j + 1} = σ(z_h${j + 1}).`;
      for (let i = 0; i < inputs; i++) {
        values.push(`x${i + 1} = ${fmt(state.x[i], 6)}`);
        values.push(`w1(x${i + 1} → h${j + 1}) = ${fmt(state.w1[i][j], 6)}`);
      }
      if (bias) values.push(`w1(b → h${j + 1}) = ${fmt(state.w1[inputs][j], 6)}`);
      if (state.started) computed = `Caderno: z(h${j + 1}) = ${Number.isFinite(state.work[`z1:${j}`]) ? fmt(state.work[`z1:${j}`]) : '—'}; O(h${j + 1}) = ${Number.isFinite(state.work[`o1:${j}`]) ? fmt(state.work[`o1:${j}`]) : '—'}.`;
    } else if (f.kind === 'biasHidden') {
      title = 'Bias da camada oculta';
      description = 'O bias b = 1 também entra em cada neurônio de saída por um peso independente.';
      formula = 'z_y = … + b·w2(b→y), com b = 1.';
      for (let k = 0; k < outputs; k++) values.push(`w2(b → y${k + 1}) = ${fmt(state.w2[hidden][k], 6)}`);
    } else if (f.kind === 'output') {
      const k = f.index;
      title = `Saída y${k + 1}`;
      description = 'A saída combina as ativações ocultas e é comparada ao alvo correspondente.';
      formula = `z_y${k + 1} = ${hiddenTerms(k)}; O_y${k + 1} = σ(z_y${k + 1}); e_y${k + 1} = t${k + 1} − O_y${k + 1}.`;
      for (let j = 0; j < hidden; j++) values.push(`w2(h${j + 1} → y${k + 1}) = ${fmt(state.w2[j][k], 6)}`);
      if (bias) values.push(`w2(b → y${k + 1}) = ${fmt(state.w2[hidden][k], 6)}`);
      values.push(`t${k + 1} = ${fmt(state.t[k], 6)}`);
      if (state.started) computed = `Caderno: z(y${k + 1}) = ${Number.isFinite(state.work[`z2:${k}`]) ? fmt(state.work[`z2:${k}`]) : '—'}; O(y${k + 1}) = ${Number.isFinite(state.work[`o2:${k}`]) ? fmt(state.work[`o2:${k}`]) : '—'}.`;
    } else if (f.kind === 'edgeW1') {
      title = `Conexão ${f.i < inputs ? `x${f.i + 1}` : 'b'} → h${f.j + 1}`;
      description = 'Esta conexão multiplica o valor da origem e o soma ao neurônio oculto de destino.';
      formula = `${f.i < inputs ? `x${f.i + 1}` : 'b'}·w1(${f.i < inputs ? `x${f.i + 1}` : 'b'}→h${f.j + 1})`;
      values.push(`peso = ${fmt(state.w1[f.i][f.j], 6)}`);
    } else if (f.kind === 'edgeW2') {
      title = `Conexão ${f.j < hidden ? `h${f.j + 1}` : 'b'} → y${f.k + 1}`;
      description = 'Esta conexão leva uma saída oculta (ou bias) para o neurônio de saída.';
      formula = `${f.j < hidden ? `O_h${f.j + 1}` : 'b'}·w2(${f.j < hidden ? `h${f.j + 1}` : 'b'}→y${f.k + 1})`;
      values.push(`peso = ${fmt(state.w2[f.j][f.k], 6)}`);
    }

    const valueList = values.length ? `<div class="inspector-values">${values.map(value => `<span>${esc(value)}</span>`).join('')}</div>` : '';
    el.neuronInspector.innerHTML = `<div class="inspector-head"><div><span class="mini-title">Inspetor do neurônio</span><h3>${esc(title)}</h3></div></div><p>${esc(description)}</p><div class="inspector-formula">${esc(formula)}</div>${computed ? `<p class="inspector-computed">${esc(computed)}</p>` : ''}${valueList}`;
  }

  function renderSummary() {
    if (!state.started) { el.summaryTables.innerHTML = '<p class="panel-help">Inicie a prática para registrar aqui os resultados que você calcular.</p>'; return; }
    const worked = (id) => Number.isFinite(state.work[id]) ? fmt(state.work[id]) : '—';
    let html = '';
    html += `<div class="summary-block"><h3>Forward</h3><table class="summary-table"><tr><th>Nó</th><th>z</th><th>O</th></tr>`;
    for (let j=0;j<state.cfg.hidden;j++) html += `<tr><td>h${j+1}</td><td>${worked(`z1:${j}`)}</td><td>${worked(`o1:${j}`)}</td></tr>`;
    for (let k=0;k<state.cfg.outputs;k++) html += `<tr><td>y${k+1}</td><td>${worked(`z2:${k}`)}</td><td>${worked(`o2:${k}`)}</td></tr>`;
    html += `</table></div>`;
    html += `<div class="summary-block"><h3>Backprop</h3><table class="summary-table"><tr><th>Nó</th><th>erro/retorno</th><th>delta</th></tr>`;
    for (let k=0;k<state.cfg.outputs;k++) html += `<tr><td>y${k+1}</td><td>${worked(`e2:${k}`)}</td><td>${worked(`d2:${k}`)}</td></tr>`;
    for (let j=0;j<state.cfg.hidden;j++) html += `<tr><td>h${j+1}</td><td>${worked(`r1:${j}`)}</td><td>${worked(`d1:${j}`)}</td></tr>`;
    html += `</table></div>`;
    html += `<div class="summary-block"><h3>w2</h3><table class="summary-table"><tr><th>Conexão</th><th>Atual</th><th>Novo</th></tr>`;
    for (let j=0;j<state.w2.length;j++) for (let k=0;k<state.cfg.outputs;k++) html += `<tr><td>${j<state.cfg.hidden?`h${j+1}`:'bias'}→y${k+1}</td><td>${fmt(state.w2[j][k])}</td><td>${worked(`nw2:${j}:${k}`)}</td></tr>`;
    html += `</table></div>`;
    html += `<div class="summary-block"><h3>w1</h3><table class="summary-table"><tr><th>Conexão</th><th>Atual</th><th>Novo</th></tr>`;
    for (let i=0;i<state.w1.length;i++) for (let j=0;j<state.cfg.hidden;j++) html += `<tr><td>${i<state.cfg.inputs?`x${i+1}`:'bias'}→h${j+1}</td><td>${fmt(state.w1[i][j])}</td><td>${worked(`nw1:${i}:${j}`)}</td></tr>`;
    html += `</table></div>`;
    el.summaryTables.innerHTML = html;
  }

  function applyPresetXor() {
    el.inputCount.value = 2; el.hiddenCount.value = 2; el.outputCount.value = 1;
    el.learningRate.value = 0.5; el.momentum.value = 0; el.useBias.checked = true;
    readConfig();
    state.x = [1,0]; state.t = [1];
    state.w1 = [[0.4,-0.2],[-0.3,0.5],[0.1,-0.1]];
    state.w2 = [[0.7],[-0.4],[0.2]];
    state.prevW1 = Array.from({length:3},()=>Array(2).fill(0));
    state.prevW2 = Array.from({length:3},()=>Array(1).fill(0));
    resetComputed();
    renderAll();
    el.setupNotice.hidden = true;
    showSetupFeedback('Exemplo XOR carregado.', 'info');
    setPanel('setupPanel');
  }

  function applyPresetIris() {
    el.inputCount.value = 4; el.hiddenCount.value = 3; el.outputCount.value = 3;
    el.learningRate.value = 0.5; el.momentum.value = 0.5; el.useBias.checked = true;
    readConfig();
    state.x = [5.1,3.5,1.4,0.2]; state.t = [1,0,0];
    state.w1 = Array.from({length:5},()=>Array.from({length:3},()=>rand(-0.5,0.5)));
    state.w2 = Array.from({length:4},()=>Array.from({length:3},()=>rand(-0.5,0.5)));
    state.prevW1 = Array.from({length:5},()=>Array(3).fill(0));
    state.prevW2 = Array.from({length:4},()=>Array(3).fill(0));
    resetComputed();
    renderAll();
    el.setupNotice.hidden = true;
    showSetupFeedback('Exemplo Iris carregado.', 'info');
    setPanel('setupPanel');
  }

  function resetAll() {
    if (state.started && !window.confirm('Restaurar o exemplo XOR e apagar o progresso atual?')) return;
    el.tolerance.value = 0.002;
    el.weightLabelMode.value = 'focus';
    applyPresetXor();
  }

  function exportJson() {
    const payload = {
      config: state.cfg,
      inputs: state.x,
      targets: state.t,
      weights: { w1: state.w1, w2: state.w2 },
      computed: state.started ? { zHidden:state.z1, oHidden:state.o1, zOutput:state.z2, oOutput:state.o2, errorOutput:state.e2, deltaOutput:state.d2, returnedHidden:state.r1, deltaHidden:state.d1, newW1:state.nw1, newW2:state.nw2 } : null
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='backprop-lab-estado.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('backprop-theme', theme);
    el.themeText.textContent = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
    el.themeIcon.textContent = theme === 'dark' ? '☀' : '◐';
  }
  function initTheme() {
    const saved = localStorage.getItem('backprop-theme');
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(saved || preferred);
  }

  function openHelp(button) {
    const [defaultTitle, defaultText] = HELP[button.dataset.help] || ['Explicação', 'Não há uma explicação disponível para este item.'];
    el.helpTitle.textContent = button.dataset.helpTitle || defaultTitle;
    el.helpBody.textContent = button.dataset.helpText || defaultText;
    el.helpModal.classList.add('is-open');
    el.helpModal.setAttribute('aria-hidden', 'false');
    el.closeHelpBtn.focus();
  }

  function closeHelp() {
    el.helpModal.classList.remove('is-open');
    el.helpModal.setAttribute('aria-hidden', 'true');
  }

  function openSetup() {
    el.setupNotice.hidden = !state.started;
    if (state.started) showSetupFeedback('Você pode consultar os dados. Qualquer alteração reiniciará a prática.', 'info');
    setPanel('setupPanel');
  }

  document.querySelectorAll('.section-tab').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.panel === 'setupPanel') openSetup();
    else if (state.started) setPanel('practicePanel');
    else {
      setPanel('setupPanel');
      showSetupFeedback('Prepare os dados e selecione “Começar prática”.', 'info');
    }
  }));

  el.randomizeBtn.addEventListener('click', () => buildFreshValues({randomize:true}));
  el.resetAllBtn.addEventListener('click', resetAll);
  el.presetXorBtn.addEventListener('click', applyPresetXor);
  el.presetIrisBtn.addEventListener('click', applyPresetIris);
  el.startBtn.addEventListener('click', startExercise);
  el.editSetupBtn.addEventListener('click', openSetup);
  el.resetProgressBtn.addEventListener('click', resetProgress);
  el.checkBtn.addEventListener('click', checkResult);
  el.answerInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkResult(); });
  el.prevBtn.addEventListener('click', () => moveStep(-1));
  el.nextBtn.addEventListener('click', () => moveStep(1));
  el.hintBtn.addEventListener('click', showHint);
  el.revealBtn.addEventListener('click', revealStep);
  el.exportBtn.addEventListener('click', exportJson);
  el.weightLabelMode.addEventListener('change', renderDiagram);
  el.themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  el.openSidebarBtn.addEventListener('click', () => document.body.classList.add('sidebar-open'));
  el.closeSidebarBtn.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  el.sidebarScrim.addEventListener('click', () => document.body.classList.remove('sidebar-open'));

  let configUpdateTimer;
  const updateConfiguration = () => {
    clearTimeout(configUpdateTimer);
    buildFreshValues({randomize:false});
  };
  const scheduleConfigurationUpdate = () => {
    clearTimeout(configUpdateTimer);
    configUpdateTimer = setTimeout(() => buildFreshValues({randomize:false}), 220);
  };
  [el.inputCount, el.hiddenCount, el.outputCount, el.learningRate, el.momentum, el.tolerance].forEach(node => {
    node.addEventListener('input', scheduleConfigurationUpdate);
    node.addEventListener('change', updateConfiguration);
  });
  el.useBias.addEventListener('change', updateConfiguration);

  document.addEventListener('click', (e) => {
    const help = e.target.closest('[data-help]');
    if (help) {
      e.preventDefault();
      e.stopPropagation();
      openHelp(help);
    }
  });
  el.closeHelpBtn.addEventListener('click', closeHelp);
  el.helpModal.addEventListener('click', (e) => { if (e.target === el.helpModal) closeHelp(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.helpModal.classList.contains('is-open')) closeHelp(); });
  document.addEventListener('pointerdown', (e) => {
    if (!state.focus || state.focusFromStep) return;
    if (e.target.closest('.node-group, #neuronInspector, #helpModal, [data-help]')) return;
    if (state.started) syncFocusToStep();
    else {
      state.focus = null;
      state.focusFromStep = false;
    }
    renderDiagram();
    renderNeuronInspector();
  });

  initTheme();
  applyPresetXor();
})();
