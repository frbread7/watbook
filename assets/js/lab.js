import {
  combineStandardUncertainty,
  comparePooledAndWithinLot,
  DIAGNOSIS_HYPOTHESES,
  extractToyThreshold,
  generateHierarchicalWaferMap,
  planMonitorCoverage,
  rankEvidence,
  simulateLotConfoundedPairs
} from './models.mjs';

const $ = (selector) => document.querySelector(selector);
const text = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
const isKorean = document.documentElement.lang === 'ko';
const words = isKorean ? {
  error: '입력값 또는 계산 범위를 확인하십시오.', none: '없음',
  measurands: ['문턱 응답', '온전류 응답', '오프 상태 누설', '접합 누설', '항복 응답', '정전용량 응답', '유전체 누설', '시트·콘택트 관련 응답'],
  cc: '정전류 문턱전압', sqrt: '제곱근 외삽', difference: '차이', gm: '고정 VOV에서의 gm',
  rss: '결합 표준 불확도 u_c', expanded: '확장값 U = k·u_c', assumes: '독립 요소 가정. k만으로 포함 확률이 보장되지는 않습니다.',
  lot: '로트', wafer: '웨이퍼', seed: '시드', min: '최솟값', max: '최댓값', mean: '평균', units: '임의의 교육 단위',
  points: '개의 합성 쌍,', lots: '개 로트', pooled: '합동 기울기', within: '로트 내 기울기', edsPerWat: 'WAT 단위당 EDS 단위',
  hypotheses: { 'process-pattern': '공정 공간 패턴', 'test-channel': '시험 채널 효과', 'extraction-change': '추출 정의 변경' },
  next: {
    'process-pattern': '사전 정의한 좌표 변환으로 독립 모니터를 비교하십시오.',
    'test-channel': '채널 배정과 측정 순서를 교차해 안정 기준을 반복 측정하십시오.',
    'extraction-change': '호환 가능한 원시 파형을 하나의 문서화된 추출 버전으로 재처리하십시오.'
  },
  empty: '후보 설명을 비교하려면 관측을 선택하십시오.', ordinal: '순위 점수',
  warning: '합성 데이터 교육 예시입니다. 예측 모델·제품 한계·인과 추정이 아닙니다. 실제 모델은 사용 목적을 선언하고 로트 단위 홀드아웃으로 검증해야 합니다.',
  model: '장채널 강반전 제곱법칙 포화 교육식입니다. 모든 피팅점에서 VDS ≥ VGS − Vth라고 가정하지만 VDS를 계산하지 않습니다. 서브스레숄드, DIBL, 직렬저항, 자체 발열, 바디 효과, 컴팩트 모델 물리는 생략합니다.',
  mapTitle: '합성 원형 7 × 7 격자 웨이퍼 파라미터 맵', row: '행', column: '열', synthetic: '합성값',
  siteCount: '개 사이트', mapDataSummary: '사이트별 생성 성분',
  mapDescription: '색과 숫자는 합성 측정값을 나타내며, 좌표와 성분은 펼친 데이터 표에서 확인할 수 있습니다.',
  normalX: '정규화 x', normalY: '정규화 y',
  lotEffect: '로트 효과', waferEffect: '웨이퍼 효과', radialEffect: '방사형 항', processValue: '공정값',
  channelOffset: '채널 오프셋', orderDrift: '순서 드리프트', noise: '노이즈', measuredValue: '측정값'
} : {
  error: 'Check the input values and calculation range.', none: 'none',
  measurands: ['threshold response', 'on-current response', 'off-state leakage', 'junction leakage', 'breakdown response', 'capacitance response', 'dielectric leakage', 'sheet/contact-related response'],
  cc: 'constant-current Vth', sqrt: 'square-root extrapolation', difference: 'difference', gm: 'gm at fixed VOV',
  rss: 'combined standard uncertainty u_c', expanded: 'expanded value U = k·u_c', assumes: 'Assumes independent components; coverage is not guaranteed by k alone.',
  lot: 'lot', wafer: 'wafer', seed: 'seed', min: 'min', max: 'max', mean: 'mean', units: 'arbitrary teaching units',
  points: 'synthetic pairs across', lots: 'lots', pooled: 'pooled slope', within: 'within-lot slope', edsPerWat: 'EDS units per WAT unit',
  hypotheses: { 'process-pattern': 'process spatial pattern', 'test-channel': 'test-channel effect', 'extraction-change': 'extraction-definition change' },
  next: {
    'process-pattern': 'Compare an independent monitor with a predeclared coordinate transform.',
    'test-channel': 'Repeat a stable reference while crossing channel assignment and measurement order.',
    'extraction-change': 'Reprocess compatible raw traces using one documented extraction revision.'
  },
  empty: 'Select observations to compare candidate explanations.', ordinal: 'ordinal score',
  warning: 'Synthetic teaching example only. This is not a prediction model, product limit, or causal estimate. Validate real models for their stated use with lot-level holdout.',
  model: 'Long-channel strong-inversion square-law saturation teaching model. It assumes VDS ≥ VGS − Vth at each fit point but does not compute VDS. It omits subthreshold, DIBL, series resistance, self-heating, body effect, and compact-model physics.',
  mapTitle: 'Synthetic circular 7 by 7 lattice wafer parameter map', row: 'row', column: 'column', synthetic: 'synthetic value',
  siteCount: 'sites', mapDataSummary: 'Per-site generated components',
  mapDescription: 'Cell color and printed values encode synthetic measurements; coordinates and components are available in the expanded data table.',
  normalX: 'normalized x', normalY: 'normalized y',
  lotEffect: 'lot effect', waferEffect: 'wafer effect', radialEffect: 'radial term', processValue: 'process value',
  channelOffset: 'channel offset', orderDrift: 'order drift', noise: 'noise', measuredValue: 'measured value'
};

function numeric(id, label, min, max, integer = false) {
  const input = document.getElementById(id);
  const value = Number(input?.value);
  if (!input || input.value.trim() === '' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(label + ' must be ' + (integer ? 'an integer ' : '') + 'between ' + min + ' and ' + max + '.');
  }
  return value;
}

function showError(outputSelector, error) {
  text(outputSelector, isKorean ? words.error : 'Input/calculation error: ' + error.message);
}

const monitorCatalog = [
  { id: 'mosfet', measurands: ['threshold response', 'on-current response', 'off-state leakage'] },
  { id: 'diode', measurands: ['junction leakage', 'breakdown response'] },
  { id: 'capacitor', measurands: ['capacitance response', 'dielectric leakage'] },
  { id: 'resistor', measurands: ['sheet/contact-related response'] }
];
const required = ['threshold response', 'on-current response', 'off-state leakage', 'junction leakage', 'breakdown response', 'capacitance response', 'dielectric leakage', 'sheet/contact-related response'];

document.querySelector('[data-action="plan-monitors"]')?.addEventListener('click', () => {
  const selected = [...document.querySelectorAll('input[name="monitor"]:checked')].map((node) => node.value);
  const result = planMonitorCoverage(selected, monitorCatalog, required);
  const percent = Math.round(result.coverageFraction * 100);
  const missing = result.missing.map((name) => words.measurands[required.indexOf(name)] || name).join(', ') || words.none;
  text('#monitor-output', isKorean ? '교육용 측정량 ' + percent + '%를 선택한 모니터가 다룹니다. 누락: ' + missing + '. 커버리지 자체는 민감도·대표성·인증을 입증하지 않습니다.' : percent + '% of the named teaching measurands are covered. Missing: ' + (missing || words.none) + '. Coverage does not establish sensitivity, representativeness, or qualification.');
});

document.querySelector('[data-action="extract"]')?.addEventListener('click', () => {
  try {
    const criterionA = numeric('criterion-ua', 'Current criterion (µA)', 0.01, 100) * 1e-6;
    const noiseA = numeric('fit-noise-na', 'Fit-point noise (nA)', 0, 500) * 1e-9;
    const result = extractToyThreshold({ criterionA, lowNoiseA: noiseA, highNoiseA: -noiseA });
    text('#extract-output', isKorean ? words.cc + ' = ' + (result.constantCurrentV * 1000).toFixed(2) + ' mV; ' + words.sqrt + ' = ' + (result.squareRootExtrapolatedV * 1000).toFixed(2) + ' mV; ' + words.difference + ' = ' + (result.deltaV * 1000).toFixed(2) + ' mV; 0.25 V 과구동에서 ' + words.gm + ' = ' + (result.gmAtHighOverdriveS * 1000).toFixed(3) + ' mS. ' + words.model : words.cc + ' = ' + (result.constantCurrentV * 1000).toFixed(2) + ' mV; ' + words.sqrt + ' = ' + (result.squareRootExtrapolatedV * 1000).toFixed(2) + ' mV; ' + words.difference + ' = ' + (result.deltaV * 1000).toFixed(2) + ' mV; ' + words.gm + ' at 0.25 V overdrive = ' + (result.gmAtHighOverdriveS * 1000).toFixed(3) + ' mS. ' + words.model);
  } catch (error) { showError('#extract-output', error); }
});

document.querySelector('[data-action="uncertainty"]')?.addEventListener('click', () => {
  try {
    const result = combineStandardUncertainty([
      { name: 'repeatability', standard: numeric('u-repeat', 'Repeatability (mV)', 0, 1000) },
      { name: 'calibration', standard: numeric('u-cal', 'Calibration (mV)', 0, 1000) },
      { name: 'other', standard: numeric('u-other', 'Other uncertainty (mV)', 0, 1000) }
    ], 2);
    text('#uncertainty-output', words.rss + ' = ' + result.combinedStandard.toFixed(3) + ' mV; ' + words.expanded + ' = ' + result.expanded.toFixed(3) + ' mV, k = ' + result.coverageFactor + '. ' + words.assumes);
  } catch (error) { showError('#uncertainty-output', error); }
});

document.querySelector('[data-action="map"]')?.addEventListener('click', () => {
  try {
    const seed = numeric('map-seed', 'Seed', 0, 0xffffffff, true);
    const result = generateHierarchicalWaferMap({ seed, lots: 3, wafersPerLot: 2, side: 7 });
    const wafer = result.points.filter((point) => point.lot === 2 && point.wafer === 1);
    const values = wafer.map((point) => point.measuredValue);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const siteCount = wafer.length;
    const grid = $('#map-grid');
    grid.replaceChildren();
    const dataRows = $('#map-data-rows');
    dataRows.replaceChildren();
    for (const point of wafer) {
      const cell = document.createElement('span');
      const level = maximum === minimum ? 0.5 : (point.measuredValue - minimum) / (maximum - minimum);
      const red = Math.round(20 + level * 160);
      const green = Math.round(90 + (1 - level) * 70);
      const blue = Math.round(100 + (1 - level) * 55);
      cell.className = 'map-cell';
      cell.style.backgroundColor = 'rgb(' + red + ' ' + green + ' ' + blue + ')';
      cell.textContent = point.measuredValue.toFixed(1);
      cell.style.gridRowStart = String(point.row + 1);
      cell.style.gridColumnStart = String(point.column + 1);
      cell.setAttribute('aria-label', words.row + ' ' + (point.row + 1) + ', ' + words.column + ' ' + (point.column + 1) + ', ' + words.synthetic + ' ' + point.measuredValue.toFixed(3));
      grid.append(cell);

      const row = document.createElement('tr');
      const fields = [
        point.row + 1, point.column + 1, point.x.toFixed(3), point.y.toFixed(3),
        point.lotEffect.toFixed(3), point.waferEffect.toFixed(3), point.radialEffect.toFixed(3),
        point.processValue.toFixed(3), point.channelArtifact.toFixed(3), point.orderArtifact.toFixed(3),
        point.randomArtifact.toFixed(3), point.measuredValue.toFixed(3)
      ];
      for (const value of fields) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      dataRows.append(row);
    }
    const countText = isKorean ? 'n=' + siteCount + ' (' + siteCount + words.siteCount + ')' : siteCount + ' ' + words.siteCount + ' (n=' + siteCount + ')';
    grid.setAttribute('aria-label', (isKorean ? '로트 2 웨이퍼 1의 ' : 'Map for lot 2 wafer 1; ') + words.mapTitle + '; ' + countText + '; ' + words.mapDescription + ' ' + words.seed + ' ' + seed + '; ' + words.min + ' ' + minimum.toFixed(3) + '; ' + words.max + ' ' + maximum.toFixed(3) + ' ' + words.units + '.');
    const summary = $('#map-data-summary');
    if (summary) summary.textContent = words.mapDataSummary + ' (n=' + siteCount + ')';
    text('#map-output', words.lot + ' 2 · ' + words.wafer + ' 1 · ' + countText + ' · ' + words.seed + ' ' + seed + ' · ' + words.min + ' ' + minimum.toFixed(3) + ' · ' + words.max + ' ' + maximum.toFixed(3) + ' · ' + words.mean + ' ' + (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3) + ' ' + words.units + '. ' + (isKorean ? '합성 공정 = 기준값 + 중심화한 로트 효과 + 웨이퍼 효과 + 방사형 항; 측정값 = 공정 + 채널 오프셋 + 순서 드리프트 + 시드가 있는 유계 삼각분포 노이즈(표준편차 σ_noise). 실제 진단에는 독립 증거가 필요합니다.' : result.model));
  } catch (error) { showError('#map-output', error); }
});

document.querySelector('[data-action="association"]')?.addEventListener('click', () => {
  const result = comparePooledAndWithinLot(simulateLotConfoundedPairs());
  text('#association-output', result.count + ' ' + words.points + ' ' + result.lotCount + ' ' + words.lots + ': ' + words.pooled + ' = ' + result.pooledSlope.toFixed(3) + ' ' + words.edsPerWat + '; ' + words.within + ' = ' + result.withinLotSlope.toFixed(3) + '. ' + words.warning);
});

const hypotheses = DIAGNOSIS_HYPOTHESES.map((hypothesis) => ({ ...hypothesis, nextMeasurement: words.next[hypothesis.id] }));
document.querySelector('[data-action="diagnose"]')?.addEventListener('click', () => {
  const observations = [...document.querySelectorAll('input[name="evidence"]:checked')].map((node) => ({ id: node.value }));
  const result = rankEvidence(hypotheses, observations);
  const lines = result.hypotheses.map((item) => words.hypotheses[item.id] + ': ' + words.ordinal + ' ' + item.score + '; ' + (isKorean ? '다음 측정: ' : 'next: ') + words.next[item.id]);
  text('#diagnosis-output', (lines.length ? lines.join(' | ') : words.empty) + ' ' + (isKorean ? '점수는 확률·인과 증명·자동 판정이 아닙니다.' : 'Scores are not probabilities, causal proof, or automatic disposition.'));
});

// Populate reference outputs so every exercise has a working, inspectable initial state.
document.querySelector('[data-action="extract"]')?.click();
document.querySelector('[data-action="uncertainty"]')?.click();
document.querySelector('[data-action="map"]')?.click();
document.querySelector('[data-action="association"]')?.click();
