const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create, meters } = require('../src/common/haptics');
const packet = (distance, maneuver = 'right') => ({ session: 'one', status: 'active', maneuver, distance });

test('a new trip buzzes once on its first guidance, even when going straight', () => {
  const state = create();
  assert.equal(state.update(packet('800 米', 'straight')), 'short');
  assert.equal(state.update(packet('780 米', 'straight')), null);
  assert.equal(state.update({ status: 'ended', rawText: '已到达目的地' }), 'long');
  assert.equal(state.update(packet('500 米', 'straight')), 'short', 'the next trip confirms the link again');
});

test('near-turn alert survives repeated heartbeats and distance jitter without repeated vibration', () => {
  const state = create();
  assert.equal(state.update(packet('69 米')), 'short');
  assert.equal(state.update(packet('50 米')), 'short');
  for (const distance of ['50 米', '49 米', '51 米', '48 米', '5 米']) assert.equal(state.update(packet(distance)), null);
  assert.equal(state.update(packet('140 米')), null);
  assert.equal(state.update(packet('40 米')), 'short');
});

test('direction change, unknown instructions, demo and cancellation are distinct', () => {
  const state = create();
  assert.equal(state.update(packet('20 米', 'straight')), 'short');
  assert.equal(state.update(packet('100 米', 'left')), 'short');
  assert.equal(state.update(packet('20 米', 'left')), 'short');
  assert.equal(state.update({ ...packet('10 米'), status: 'demo' }), null);
  assert.equal(state.update(packet('', 'unknown')), null);
  assert.equal(state.update({ status: 'ended', rawText: '导航结束' }), null);
  assert.equal(state.update(packet('30 米')), 'short');
  assert.equal(state.update({ status: 'ended', rawText: '已到达目的地' }), 'long');
  assert.equal(state.update({ status: 'ended', rawText: '已到达目的地' }), null);
});

test('unknown distances never become zero and kilometer units are converted', () => {
  assert.equal(meters(''), null);
  assert.equal(meters('剩余30米'), null);
  assert.equal(meters('0.05 公里'), 50);
  assert.equal(meters('1.2 km'), 1200);
});
