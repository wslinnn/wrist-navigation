const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clockText, speedKmh } = require('../src/common/metrics');

test('clock renders a local 24-hour time and rejects invalid input', () => {
  const noon = new Date(2026, 9, 29, 9, 5, 30);
  assert.equal(clockText(noon.getTime()), '09:05');
  assert.equal(clockText(new Date(2026, 9, 29, 23, 59)), '23:59');
  assert.equal(clockText('not a time'), '');
  assert.equal(clockText(undefined), '');
});

test('gps speed normalizes to whole km/h and filters standstill noise', () => {
  assert.equal(speedKmh(0), 0);
  assert.equal(speedKmh(0.1), 0, 'under 0.5 km/h is standstill drift, not motion');
  assert.equal(speedKmh(5.4), 19);
  assert.equal(speedKmh(13.89), 50);
  assert.equal(speedKmh(-1), null, 'negative speed is an invalid reading');
  assert.equal(speedKmh(undefined), null);
  assert.equal(speedKmh(null), null, 'no fix is not a standstill reading');
  assert.equal(speedKmh('fast'), null);
});
