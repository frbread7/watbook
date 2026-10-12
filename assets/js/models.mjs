/*
 * Deterministic teaching models for WATBook.
 * These are synthetic and intentionally simplified; see docs/MODELS_AND_VALIDATION.md.
 */

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(name + ' must be finite');
  return value;
}

function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(name + ' must be greater than zero');
  return value;
}

export function planMonitorCoverage(selectedIds, monitorCatalog, requiredMeasurands) {
  if (!Array.isArray(selectedIds) || !Array.isArray(monitorCatalog) || !Array.isArray(requiredMeasurands)) {
    throw new TypeError('monitor inputs must be arrays');
  }
  const selected = new Set(selectedIds);
  const covered = new Set();
  for (const monitor of monitorCatalog) {
    if (selected.has(monitor.id)) {
      for (const measurand of monitor.measurands) covered.add(measurand);
    }
  }
  const missing = requiredMeasurands.filter((item) => !covered.has(item));
  const coveredRequired = requiredMeasurands.length - missing.length;
  return {
    covered: [...covered].sort(),
    missing,
    coverageFraction: requiredMeasurands.length === 0 ? 1 : coveredRequired / requiredMeasurands.length,
    warning: 'Coverage indicates only that a proposed monitor has a named measurand; it does not establish structure quality, process sensitivity, representativeness, or qualification.'
  };
}

/** Strong-inversion square-law toy model, not a compact MOSFET model. */
export function extractToyThreshold({
  vth = 0.45,
  betaAperV2 = 0.001,
  ioffA = 1e-9,
  criterionA = 10e-6,
  lowOverdriveV = 0.10,
  highOverdriveV = 0.25,
  lowNoiseA = 0,
  highNoiseA = 0
} = {}) {
  finite(vth, 'vth');
  positive(betaAperV2, 'betaAperV2');
  finite(ioffA, 'ioffA');
  if (ioffA < 0) throw new RangeError('ioffA cannot be negative');
  positive(criterionA, 'criterionA');
  positive(lowOverdriveV, 'lowOverdriveV');
  positive(highOverdriveV, 'highOverdriveV');
  finite(lowNoiseA, 'lowNoiseA');
  finite(highNoiseA, 'highNoiseA');
  if (criterionA <= ioffA) throw new RangeError('criterionA must exceed ioffA');
  if (highOverdriveV <= lowOverdriveV) throw new RangeError('highOverdriveV must exceed lowOverdriveV');

  // ID = Ioff + beta * max(VGS - Vth, 0)^2.  The square-root-line fit
  // uses two synthetic strong-inversion points and exposes noise sensitivity.
  const constantCurrentV = vth + Math.sqrt((criterionA - ioffA) / betaAperV2);
  const lowCurrentA = ioffA + betaAperV2 * lowOverdriveV ** 2 + lowNoiseA;
  const highCurrentA = ioffA + betaAperV2 * highOverdriveV ** 2 + highNoiseA;
  if (![constantCurrentV, lowCurrentA, highCurrentA].every(Number.isFinite)) throw new RangeError('current or extracted result is outside the finite numeric range');
  if (lowCurrentA <= ioffA || highCurrentA <= ioffA) throw new RangeError('noisy currents must remain above Ioff');
  const x1 = Math.sqrt(lowCurrentA - ioffA);
  const x2 = Math.sqrt(highCurrentA - ioffA);
  if (Math.abs(x2 - x1) < Number.EPSILON) throw new RangeError('extraction points are numerically indistinguishable');
  const slope = (highOverdriveV - lowOverdriveV) / (x2 - x1);
  const intercept = lowOverdriveV - slope * x1;
  const squareRootExtrapolatedV = vth + intercept;
  const gmAtHighOverdriveS = 2 * betaAperV2 * highOverdriveV;
  if (![constantCurrentV, squareRootExtrapolatedV, gmAtHighOverdriveS].every(Number.isFinite)) {
    throw new RangeError('extracted result is outside the finite numeric range');
  }
  return {
    constantCurrentV,
    squareRootExtrapolatedV,
    deltaV: constantCurrentV - squareRootExtrapolatedV,
    gmAtHighOverdriveS,
    model: 'Long-channel strong-inversion square-law saturation toy model; it assumes VDS is high enough to keep every fitting point in saturation, but does not model VDS. It omits subthreshold, DIBL, series resistance, self-heating, body effect, and compact-model physics.'
  };
}

export function combineStandardUncertainty(components, coverageFactor = 2) {
  if (!Array.isArray(components) || components.length === 0) throw new TypeError('components must be a non-empty array');
  positive(coverageFactor, 'coverageFactor');
  let variance = 0;
  for (const item of components) {
    if (!item || typeof item.name !== 'string') throw new TypeError('each component requires a name');
    const standard = finite(item.standard, item.name + ' standard uncertainty');
    if (standard < 0) throw new RangeError(item.name + ' standard uncertainty cannot be negative');
    variance += standard ** 2;
    if (!Number.isFinite(variance)) throw new RangeError('combined variance is outside the finite numeric range');
  }
  const combinedStandard = Math.sqrt(variance);
  const expanded = coverageFactor * combinedStandard;
  if (!Number.isFinite(combinedStandard) || !Number.isFinite(expanded)) throw new RangeError('combined uncertainty is outside the finite numeric range');
  return { combinedStandard, expanded, coverageFactor };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateHierarchicalWaferMap({
  seed = 17,
  lots = 3,
  wafersPerLot = 2,
  side = 7,
  baseline = 100,
  radialAmplitude = 2,
  channelOffset = 0.8,
  sequenceDrift = 0.02,
  randomSigma = 0.25
} = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isInteger(lots) || !Number.isInteger(wafersPerLot) || !Number.isInteger(side) || lots < 1 || wafersPerLot < 1 || side < 2) {
    throw new RangeError('seed must be an integer, lots >= 1, wafersPerLot >= 1, and side >= 2');
  }
  finite(baseline, 'baseline');
  finite(radialAmplitude, 'radialAmplitude');
  finite(channelOffset, 'channelOffset');
  finite(sequenceDrift, 'sequenceDrift');
  finite(randomSigma, 'randomSigma');
  if (randomSigma < 0) throw new RangeError('randomSigma cannot be negative');
  if (lots > 20 || wafersPerLot > 20 || side > 21) throw new RangeError('map dimensions exceed the teaching model limits');
  const random = seededRandom(seed);
  const points = [];
  const channels = [-1.5, -0.5, 0.5, 1.5];
  const sites = [];
  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const x = (column / (side - 1)) * 2 - 1;
      const y = (row / (side - 1)) * 2 - 1;
      const radius = Math.hypot(x, y);
      if (radius <= 1) sites.push({ row, column, x, y, radius });
    }
  }
  const perWafer = sites.length;
  for (let lot = 0; lot < lots; lot += 1) {
    const lotEffect = (lot - (lots - 1) / 2) * 0.55;
    for (let wafer = 0; wafer < wafersPerLot; wafer += 1) {
    const waferEffect = (wafer - (wafersPerLot - 1) / 2) * 0.18;
    for (const [index, { row, column, x, y, radius }] of sites.entries()) {
      const radial = radialAmplitude * radius ** 2;
      const channel = index % channels.length;
      const channelArtifact = channels[channel] * channelOffset;
      const orderArtifact = (index - (perWafer - 1) / 2) * sequenceDrift;
      const noise = (random() + random() - 1) * Math.sqrt(6) * randomSigma;
      const processValue = baseline + lotEffect + waferEffect + radial;
      const measuredValue = processValue + channelArtifact + orderArtifact + noise;
      if (![processValue, channelArtifact, orderArtifact, noise, measuredValue].every(Number.isFinite)) {
        throw new RangeError('map value is outside the finite numeric range');
      }
      points.push({
        lot: lot + 1, wafer: wafer + 1, row, column, x, y, radius, channel, sequenceIndex: index,
        lotEffect, waferEffect, radialEffect: radial, processValue,
        channelArtifact, orderArtifact, randomArtifact: noise,
        measuredValue
      });
    }
    }
  }
  return {
    points,
    seed,
    model: 'Synthetic process = baseline + centered lot effect + centered wafer-within-lot effect + radial term; measured = process + deterministic channel offset + sequence drift + seeded bounded triangular noise (standard deviation randomSigma). The decomposition is known because this is generated data; real diagnosis needs independent evidence.'
  };
}

export function simulateLotConfoundedPairs({ lots = 4, perLot = 10 } = {}) {
  if (!Number.isInteger(lots) || lots < 3 || !Number.isInteger(perLot) || perLot < 4) {
    throw new RangeError('use at least 3 lots and 4 observations per lot');
  }
  const rows = [];
  for (let lot = 0; lot < lots; lot += 1) {
    const lotShift = lot - (lots - 1) / 2;
    for (let sample = 0; sample < perLot; sample += 1) {
      const within = sample - (perLot - 1) / 2;
      rows.push({
        lot: lot + 1,
        wat: 100 + 12 * lotShift + within,
        eds: 500 + 30 * lotShift - 2 * within
      });
    }
  }
  return rows;
}

function slope(rows, xKey, yKey, centerByLot) {
  const groups = new Map();
  for (const row of rows) {
    const key = centerByLot ? row.lot : 'all';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const transformed = [];
  for (const group of groups.values()) {
    const meanX = group.reduce((sum, row) => sum + row[xKey], 0) / group.length;
    const meanY = group.reduce((sum, row) => sum + row[yKey], 0) / group.length;
    for (const row of group) transformed.push([row[xKey] - meanX, row[yKey] - meanY]);
  }
  const numerator = transformed.reduce((sum, [x, y]) => sum + x * y, 0);
  const denominator = transformed.reduce((sum, [x]) => sum + x * x, 0);
  if (denominator === 0) throw new RangeError('slope is not estimable because WAT has no variation in the selected grouping');
  const estimate = numerator / denominator;
  if (!Number.isFinite(estimate)) throw new RangeError('slope is outside the finite numeric range');
  return estimate;
}

export function comparePooledAndWithinLot(rows) {
  if (!Array.isArray(rows) || rows.length < 4 || rows.some((row) => !Number.isFinite(row.wat) || !Number.isFinite(row.eds) || row.lot == null)) {
    throw new TypeError('rows must contain at least four finite WAT/EDS pairs with lot IDs');
  }
  return {
    pooledSlope: slope(rows, 'wat', 'eds', false),
    withinLotSlope: slope(rows, 'wat', 'eds', true),
    count: rows.length,
    lotCount: new Set(rows.map((row) => row.lot)).size,
    warning: 'These synthetic slopes demonstrate aggregation and confounding only. They are not a prediction model, product limit, or causal estimate. Validate any real model with grouped holdout and a predeclared use case.'
  };
}

export const DIAGNOSIS_HYPOTHESES = Object.freeze([
  Object.freeze({ id: 'process-pattern', evidence: Object.freeze({ radial: 1, channel: -1, program: 0, reference: -1 }) }),
  Object.freeze({ id: 'test-channel', evidence: Object.freeze({ radial: -1, channel: 1, program: 0, reference: 1 }) }),
  Object.freeze({ id: 'extraction-change', evidence: Object.freeze({ radial: 0, channel: 0, program: 1, reference: 0 }) })
]);

export function rankEvidence(hypotheses, observations) {
  if (!Array.isArray(hypotheses) || !Array.isArray(observations)) throw new TypeError('hypotheses and observations must be arrays');
  const scores = hypotheses.map((hypothesis) => {
    let score = 0;
    for (const observation of observations) {
      const direction = hypothesis.evidence?.[observation.id] ?? 0;
      if (![ -1, 0, 1 ].includes(direction)) throw new RangeError('evidence weights must be -1, 0, or 1');
      score += direction;
    }
    return { id: hypothesis.id, score, nextMeasurement: hypothesis.nextMeasurement };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { hypotheses: scores, warning: 'Ordinal evidence scores organize discussion; they are not probabilities, causal proof, or an automatic disposition.' };
}
