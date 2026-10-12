import test from 'node:test';
import assert from 'node:assert/strict';
import {
  combineStandardUncertainty,
  comparePooledAndWithinLot,
  DIAGNOSIS_HYPOTHESES,
  extractToyThreshold,
  generateHierarchicalWaferMap,
  planMonitorCoverage,
  rankEvidence,
  simulateLotConfoundedPairs
} from '../assets/js/models.mjs';

test('monitor plan reports uncovered measurands instead of implying qualification', () => {
  const monitors = [
    { id: 'mos', measurands: ['vth', 'idsat'] },
    { id: 'diode', measurands: ['leakage', 'breakdown'] }
  ];
  const result = planMonitorCoverage(['mos'], monitors, ['vth', 'idsat', 'leakage']);
  assert.deepEqual(result.missing, ['leakage']);
  assert.equal(result.coverageFraction, 2 / 3);
});

test('toy MOS threshold methods have known zero-noise values and method-dependent offsets', () => {
  const exact = extractToyThreshold({ vth: 0.45, betaAperV2: 0.001, criterionA: 10e-6 });
  assert.ok(Math.abs(exact.squareRootExtrapolatedV - 0.45) < 1e-12);
  assert.ok(Math.abs(exact.constantCurrentV - (0.45 + Math.sqrt((10e-6 - 1e-9) / 0.001))) < 1e-12);
  assert.ok(Math.abs(exact.gmAtHighOverdriveS - 0.0005) < 1e-12);
  const noisy = extractToyThreshold({ lowNoiseA: 0.2e-6, highNoiseA: -0.3e-6 });
  assert.notEqual(noisy.squareRootExtrapolatedV, exact.squareRootExtrapolatedV);
  assert.throws(() => extractToyThreshold({ criterionA: 1e-10 }), /criterionA must exceed ioffA/);
  assert.throws(() => extractToyThreshold({ ioffA: -1e-9 }), /cannot be negative/);
  assert.throws(() => extractToyThreshold({ betaAperV2: Number.MIN_VALUE }), /finite numeric range/);
});

test('uncertainty propagation uses independent-component RSS and a declared coverage factor', () => {
  const result = combineStandardUncertainty([{ name: 'repeatability', standard: 3 }, { name: 'calibration', standard: 4 }], 2);
  assert.equal(result.combinedStandard, 5);
  assert.equal(result.expanded, 10);
  assert.throws(() => combineStandardUncertainty([{ name: 'bad', standard: -1 }]), /cannot be negative/);
  assert.throws(() => combineStandardUncertainty([{ name: 'overflow', standard: Number.MAX_VALUE }]), /finite numeric range/);
});

test('wafer map is deterministic, separates generated process and channel artifacts, and respects dimensions', () => {
  const a = generateHierarchicalWaferMap({ seed: 71, lots: 2, side: 5 });
  const b = generateHierarchicalWaferMap({ seed: 71, lots: 2, side: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.points.length, 52);
  for (const point of a.points) {
    assert.ok(point.radius <= 1);
    assert.equal(point.processValue, 100 + point.lotEffect + point.waferEffect + point.radialEffect);
    assert.equal(point.measuredValue, point.processValue + point.channelArtifact + point.orderArtifact + point.randomArtifact);
  }
  assert.throws(() => generateHierarchicalWaferMap({ side: 1 }), /side >= 2/);
  assert.throws(() => generateHierarchicalWaferMap({ randomSigma: Number.NaN }), /must be finite/);
  assert.equal(new Set(a.points.map((point) => point.wafer)).size, 2);
});

test('pooled WAT to EDS slope can reverse the within-lot relation in synthetic data', () => {
  const result = comparePooledAndWithinLot(simulateLotConfoundedPairs());
  assert.ok(result.pooledSlope > 0);
  assert.ok(result.withinLotSlope < 0);
  assert.equal(result.lotCount, 4);
  assert.equal(result.count, 40);
  assert.ok(Math.abs(result.withinLotSlope - (-2)) < 1e-12);
  assert.ok(Math.abs(result.pooledSlope - (433.5 / 188.25)) < 1e-12);
  assert.throws(() => comparePooledAndWithinLot([
    { lot: 1, wat: 1, eds: 2 }, { lot: 1, wat: 1, eds: 3 },
    { lot: 2, wat: 1, eds: 4 }, { lot: 2, wat: 1, eds: 5 }
  ]), /not estimable/);
});

test('diagnosis ranking remains ordinal and validates evidence scale', () => {
  const result = rankEvidence([
    { id: 'process-shift', evidence: { radial: 1, channel: -1 }, nextMeasurement: 'Compare independent monitor sites.' },
    { id: 'test-channel', evidence: { radial: -1, channel: 1 }, nextMeasurement: 'Swap channel assignment.' }
  ], [{ id: 'radial' }, { id: 'channel' }]);
  assert.equal(result.hypotheses[0].score, 0);
  const referenceCheck = rankEvidence(DIAGNOSIS_HYPOTHESES, [{ id: 'reference' }]);
  assert.deepEqual(referenceCheck.hypotheses.map(({ id, score }) => [id, score]), [
    ['test-channel', 1], ['extraction-change', 0], ['process-pattern', -1]
  ]);
  assert.match(result.warning, /not probabilities/);
  assert.throws(() => rankEvidence([{ id: 'x', evidence: { e: 2 } }], [{ id: 'e' }]), /-1, 0, or 1/);
});
