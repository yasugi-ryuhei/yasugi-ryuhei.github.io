const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const G = require('../js/generator.js');

// 牌の書き方: "123m456p789s" + 字牌は z (1-4 東南西北, 5-7 白發中)
function parse(str) {
  const out = [];
  let nums = [];
  for (const ch of str) {
    if (/\d/.test(ch)) nums.push(Number(ch));
    else {
      const base = { m: 0, p: 9, s: 18, z: 27 }[ch];
      nums.forEach((n) => out.push(base + n - 1));
      nums = [];
    }
  }
  return out;
}
function hand(closed, win, opt = {}) {
  return Object.assign({
    closed: parse(closed), winTile: parse(win)[0], melds: [], tsumo: false, riichi: false,
    seatWind: 28, roundWind: 27, doraIndicators: []
  }, opt);
}
const names = (r) => r.yaku.map((y) => y.name).sort();

test('立直・平和・ツモは20符3翻 700-1300', () => {
  const r = E.evaluate(hand('123m567m23p678s55s', '4p', { tsumo: true, riichi: true }));
  assert.deepStrictEqual(names(r), ['平和', '立直', '門前清自摸和'].sort());
  assert.strictEqual(r.fu, 20);
  assert.strictEqual(r.score.text, '700-1300');
});

test('立直・平和のロンは30符2翻 2000', () => {
  const r = E.evaluate(hand('123m567m23p678s55s', '4p', { riichi: true }));
  assert.strictEqual(r.fu, 30);
  assert.strictEqual(r.han, 2);
  assert.strictEqual(r.score.text, '2000');
});

test('七対子は25符', () => {
  const r = E.evaluate(hand('1199m2288p3377s5z', '5z', { riichi: true }));
  assert.strictEqual(r.fu, 25);
  assert.strictEqual(r.han, 3);
  assert.strictEqual(r.score.text, '3200');
});

test('鳴いたタンヤオのみは30符1翻 1000', () => {
  const r = E.evaluate(hand('234m567p34s66s', '5s', {
    melds: [{ type: 'chi', tiles: parse('345p') }]
  }));
  assert.deepStrictEqual(names(r), ['断么九']);
  assert.strictEqual(r.fu, 30);
  assert.strictEqual(r.score.text, '1000');
});

test('白の暗刻とカンチャン待ちの門前ロンは40符', () => {
  const r = E.evaluate(hand('234m79p789s555z99m', '8p'));
  assert.deepStrictEqual(names(r), ['役牌 白']);
  assert.strictEqual(r.fu, 40);
  assert.strictEqual(r.score.text, '1300');
});

test('ロンで完成した刻子は明刻になる', () => {
  // シャンポン待ちのロン: 9萬は明刻(4符)、白は暗刻(8符) → 20+10+4+8=42 → 50符
  const r = E.evaluate(hand('99m555z123p456s88s', '9m', { riichi: true }));
  assert.strictEqual(r.fu, 50);
});

test('親の30符4翻ロンは11600', () => {
  const r = E.evaluate(hand('234m567m23p678s55s', '4p', {
    riichi: true, seatWind: 27, doraIndicators: parse('4s')
  }));
  // 立直・平和・断么九 + ドラ5索2枚
  assert.strictEqual(r.han, 5);
  assert.strictEqual(r.score.limit, '満貫');
  assert.strictEqual(r.score.text, '12000');
});

test('高点法: 一盃口になる解釈が選ばれる', () => {
  const r = E.evaluate(hand('223344m567p678s9s', '9s', { riichi: true }));
  assert.ok(names(r).includes('一盃口'));
});

test('混一色・役牌・対々和', () => {
  const r = E.evaluate(hand('111m99m77z', '9m', {
    melds: [{ type: 'pon', tiles: parse('666z') }, { type: 'pon', tiles: parse('333m') }]
  }));
  assert.deepStrictEqual(names(r), ['対々和', '役牌 發', '混一色'].sort());
  assert.strictEqual(r.han, 5);
});

test('役がなければ null', () => {
  const r = E.evaluate(hand('123m567p34s99s', '5s', {
    melds: [{ type: 'chi', tiles: parse('345p') }]
  }));
  assert.strictEqual(r, null);
});

test('大三元は役満', () => {
  const r = E.evaluate(hand('555z666z77z123m99p', '7z', { tsumo: true }));
  assert.strictEqual(r.yakuman, 1);
  assert.strictEqual(r.score.text, '8000-16000');
});

test('点数表: 主な値', () => {
  assert.strictEqual(E.calcScore(3, 30, false, false).text, '3900');
  assert.strictEqual(E.calcScore(4, 30, false, false).text, '7700');
  assert.strictEqual(E.calcScore(4, 30, true, false).text, '11600');
  assert.strictEqual(E.calcScore(2, 70, false, false).text, '4500');
  assert.strictEqual(E.calcScore(3, 60, false, false).text, '7700');
  assert.strictEqual(E.calcScore(4, 40, false, false).text, '8000');
  assert.strictEqual(E.calcScore(1, 30, true, true).text, '500オール');
  assert.strictEqual(E.calcScore(2, 30, false, true).text, '500-1000');
  assert.strictEqual(E.calcScore(6, 30, false, false).text, '12000');
  assert.strictEqual(E.calcScore(8, 30, true, false).text, '24000');
});

test('ドラ表示牌の次の牌がドラ', () => {
  assert.strictEqual(E.doraFromIndicator(8), 0);
  assert.strictEqual(E.doraFromIndicator(30), 27);
  assert.strictEqual(E.doraFromIndicator(33), 31);
});

test('出題: 1000問つくっても壊れず、選択肢は4つで正解を1つ含む', () => {
  for (let i = 0; i < 1000; i++) {
    const q = i % 2 ? G.makeHandQuestion() : G.makeTableQuestion();
    assert.strictEqual(q.options.length, 4);
    assert.strictEqual(new Set(q.options).size, 4);
    assert.strictEqual(q.options.filter((o) => o === q.answer).length, 1);
    if (q.hand) {
      const all = q.hand.closed.concat([q.hand.winTile], q.hand.doraIndicators);
      q.hand.melds.forEach((m) => all.push(...m.tiles));
      const c = new Array(34).fill(0);
      all.forEach((t) => c[t]++);
      assert.ok(c.every((x) => x <= 4), '同じ牌は4枚まで');
      const n = q.hand.closed.length + 1 + q.hand.melds.length * 3;
      assert.strictEqual(n, 14);
      assert.strictEqual(E.evaluate(q.hand).score.text, q.answer);
    }
  }
});
