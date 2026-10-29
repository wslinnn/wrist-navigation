const { test } = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../src/common/settings');
const presentation = require('../src/common/presentation');

test('device preferences reject invalid values and bound layout sizes', () => {
  assert.deepEqual(settings.normalize(null), settings.DEFAULTS);
  assert.deepEqual(settings.normalize({ fontSize: 1000, arrowSize: -8, arrowWeight: NaN }),
    { fontSize: 44, arrowSize: 32, arrowWeight: 8 });
  assert.equal(settings.normalize({ fontSize: '40' }).fontSize, 30);
  const legacy = settings.normalize({ font: 'song', fontSize: 40, heartRate: true });
  assert.deepEqual(legacy, { fontSize: 40, arrowSize: 42, arrowWeight: 8 });
  assert.equal('font' in legacy, false, 'unknown and retired fields are dropped');
});

test('a late load cannot undo user changes and queued writes finish in order', () => {
  let reading;
  const writes = [];
  const loaded = [];
  const statuses = [];
  const store = settings.createStore({ get: callbacks => { reading = callbacks; }, set: callbacks => writes.push(callbacks) },
    value => loaded.push(value), value => statuses.push(value));
  store.load();
  store.save({ fontSize: 35 });
  store.save({ fontSize: 38 });
  store.save({ fontSize: 40 });
  reading.success('{"fontSize":24}');
  assert.deepEqual(loaded, []);
  assert.equal(writes.length, 1);
  writes[0].success();
  assert.equal(writes.length, 2);
  assert.equal(JSON.parse(writes[1].value).fontSize, 40);
  writes[0].fail(); // duplicate callback must not clear a newer in-flight write
  assert.notEqual(statuses.at(-1), '已保存');
  writes[1].success();
  assert.equal(statuses.at(-1), '已保存');
});

test('corrupt settings, storage errors and callbacks after destruction are contained', () => {
  const loaded = [];
  const statuses = [];
  let writing;
  const store = settings.createStore({ get: cb => cb.success('{bad'), set: cb => { writing = cb; } },
    value => loaded.push(value), value => statuses.push(value));
  store.load();
  assert.deepEqual(loaded[0], settings.DEFAULTS);
  store.save({ fontSize: 39 });
  store.dispose();
  const count = statuses.length;
  writing.success();
  assert.equal(statuses.length, count);
  const broken = settings.createStore({ get() { throw Error('offline'); }, set() { throw Error('full'); } }, () => {}, value => statuses.push(value));
  assert.doesNotThrow(() => broken.load());
  assert.doesNotThrow(() => broken.save({ fontSize: 41 }));
  assert.match(statuses.at(-1), /保存失败/);
});

test('guidance uses the full original instruction and preserves long text at every size', () => {
  const raw = '直行200米\n前往示例道路后继续直行，请注意路况🚦'.repeat(10);
  const view = { rawText: raw + '\n高德导航中', instruction: '直行', distance: '200米' };
  assert.equal(presentation.navigationText(view), raw);
  assert.equal(presentation.navigationText({ rawText: '请注意特殊指引', instruction: '直行', distance: '200米' }), '请注意特殊指引');
  for (let fontSize = 24; fontSize <= 44; fontSize++) {
    const layout = presentation.navigationLayout(view, { ...settings.DEFAULTS, fontSize }, '');
    assert.equal(layout.guidanceLines.join(''), raw.replace(/\n/g, ''));
    assert.ok(layout.guidanceLines.every(row => Array.from(row).length <= Math.floor(288 / fontSize)));
    assert.ok(layout.guidanceHeight <= 166);
  }
});
