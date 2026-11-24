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

const S = require('../js/shanten.js');
const R = require('../js/rules.js');
const cnt = (str) => { const c = new Array(34).fill(0); parse(str).forEach((t) => c[t]++); return c; };

test('シャンテン数', () => {
  assert.strictEqual(S.shanten(cnt('123m456p789s1122z')), 0);
  assert.strictEqual(S.shanten(cnt('123m456p789s11222z')), -1);
  assert.strictEqual(S.shanten(cnt('19m19p19s1234567z')), 0);
  assert.strictEqual(S.shanten(cnt('1199m2288p3377s5z')), 0);
  assert.strictEqual(S.shanten(cnt('147m258p369s1234z')), 6); // バラバラは七対子の6シャンテン
  assert.strictEqual(S.shanten(cnt('2345m')), 0);  // 3面子を鳴いた後の単騎形
});

test('待ち牌: 残り枚数は手牌で使った分を引く、三面張は3種', () => {
  const u = S.ukeire(cnt('123m456p78s99s555z'));
  assert.deepStrictEqual(u.tiles.map((x) => x.tile), [23, 26]);
  assert.strictEqual(u.total, 6); // 6索4枚 + 9索は手に2枚あるので残り2枚
  const v = S.ukeire(cnt('23456m456p789s11z'));
  assert.deepStrictEqual(v.tiles.map((x) => x.tile), [0, 3, 6]);
});

test('何を切るか: テンパイになる打牌が先頭に来る', () => {
  const d = S.discards(cnt('123m456p78s99s555z1z'));
  assert.strictEqual(d[0].discard, 27);
  assert.strictEqual(d[0].shanten, 0);
});

test('ルール: 切り上げ満貫・1000点単位・三人麻雀のツモ', () => {
  const std = E.DEFAULT_RULES;
  assert.strictEqual(E.calcScore(4, 30, false, false, 0, { ...std, kiriage: true }).text, '8000');
  assert.strictEqual(E.calcScore(3, 30, false, false, 0, { ...std, round1000: true }).text, '4000');
  assert.strictEqual(E.calcScore(3, 30, false, true, 0, { ...std, round1000: true }).text, '1000-2000');
  const sanma = { ...std, players: 3 };
  assert.strictEqual(E.calcScore(5, 30, false, true, 0, sanma).total, 6000);       // ツモ損あり: 2000+4000
  assert.strictEqual(E.calcScore(5, 30, false, true, 0, { ...sanma, tsumoLoss: false }).text, '3000-5000');
  assert.strictEqual(E.calcScore(5, 30, true, true, 0, { ...sanma, tsumoLoss: false }).text, '6000オール');
});

test('ルール: 赤ドラは1枚1翻、喰いタンなしでは鳴きタンヤオは役なし', () => {
  const h = hand('234m567p34s66s', '5s', { melds: [{ type: 'chi', tiles: [12, 35, 14] }] });
  const r = E.evaluate(h);
  assert.strictEqual(r.aka, 1);
  assert.strictEqual(r.han, 2);
  assert.strictEqual(E.evaluate(h, { ...E.DEFAULT_RULES, kuitan: false }), null);
});

test('出題: 各ルールで1000問ずつ作っても整合する', () => {
  const variants = [R.PRESETS.standard, R.PRESETS.sanma,
    { ...R.PRESETS.sanma, round1000: true, tsumoLoss: false }, { ...R.PRESETS.standard, aka: 4, kiriage: true, kuitan: false }];
  variants.forEach((rules) => {
    for (let i = 0; i < 1000; i++) {
      const q = i % 2 ? G.makeHandQuestion(rules) : G.makeTableQuestion(rules);
      assert.strictEqual(new Set(q.options).size, 4, JSON.stringify(q.options));
      assert.ok(q.options.includes(q.answer));
      if (q.hand) {
        const all = q.hand.closed.concat([q.hand.winTile]);
        q.hand.melds.forEach((m) => all.push(...m.tiles));
        assert.ok(all.filter((t) => t >= 34).length <= rules.aka);
        if (rules.players === 3) {
          assert.ok(all.every((t) => !(t >= 1 && t <= 7) && t !== 34), '三人麻雀で二〜八萬は出ない');
          assert.ok(q.hand.melds.every((m) => m.type !== 'chi'));
        }
      }
    }
  });
});

test('国士無双とダブル役満', () => {
  const dbl = { ...E.DEFAULT_RULES, doubleYakuman: true };
  const k = E.evaluate(hand('19m19p19s1234566z', '7z'));
  assert.deepStrictEqual(names(k), ['国士無双']);
  assert.strictEqual(k.score.text, '32000');
  const k13 = hand('19m19p19s1234567z', '7z');
  assert.strictEqual(E.evaluate(k13).score.text, '32000');
  assert.strictEqual(E.evaluate(k13, dbl).score.text, '64000');
  assert.strictEqual(E.evaluate(k13, dbl).score.limit, 'ダブル役満');
  const tanki = hand('222m888m555p111s9s', '9s', { tsumo: true });
  assert.deepStrictEqual(names(E.evaluate(tanki, dbl)), ['四暗刻単騎']);
  assert.strictEqual(E.evaluate(tanki, dbl).score.text, '16000-32000');
  const chuuren = hand('1112345678999m', '5m');
  assert.deepStrictEqual(names(E.evaluate(chuuren)), ['純正九蓮宝燈']);
  assert.deepStrictEqual(names(E.evaluate(hand('1112345678999m'.replace('5', '55').replace('999', '99'), '9m'))), ['九蓮宝燈']);
});

test('状況役: 一発・ダブル立直・嶺上開花・天和、ドラ枚数の直接指定', () => {
  const base = '123m567m23p678s55s';
  const r = E.evaluate(hand(base, '4p', { riichi: true, doubleRiichi: true, flags: { ippatsu: true }, extraDora: 2 }));
  assert.deepStrictEqual(names(r), ['ダブル立直', '一発', '平和'].sort());
  assert.strictEqual(r.han, 6);
  // 役なしの鳴き手でも嶺上開花で和了できる
  const open = hand('123m567p34s99s', '5s', { tsumo: true, flags: { rinshan: true }, melds: [{ type: 'minkan', tiles: [31, 31, 31, 31] }] });
  assert.ok(names(E.evaluate(open)).includes('嶺上開花'));
  const t = E.evaluate(hand(base, '4p', { tsumo: true, seatWind: 27, flags: { tenhou: true } }));
  assert.deepStrictEqual(names(t), ['天和']);
  assert.strictEqual(t.score.text, '16000オール');
});

test('三人麻雀の北抜きドラ: 1枚1翻、北がドラなら2翻分', () => {
  const sanma = { ...R.PRESETS.sanma };
  const h = (ind) => hand('456p789p23s678s55s', '4s', { riichi: true, nuki: 2, doraIndicators: ind });
  assert.strictEqual(E.evaluate(h([]), sanma).han, 4);          // 立直・平和 + 北抜き2
  assert.strictEqual(E.evaluate(h([29]), sanma).han, 6);        // 表示牌が西なら北がドラ
  assert.strictEqual(E.evaluate(h([]), { ...sanma, nukidora: false }).han, 2);
  assert.strictEqual(E.evaluate(h([]), R.PRESETS.standard).han, 2); // 四人麻雀では数えない
  for (let i = 0; i < 500; i++) {
    const q = G.makeHandQuestion(sanma);
    const all = q.hand.closed.concat([q.hand.winTile]);
    q.hand.melds.forEach((m) => all.push(...m.tiles));
    assert.ok(!all.includes(30), '北抜きありでは北を手牌に入れない');
    assert.strictEqual(E.evaluate(q.hand, sanma).score.text, q.answer);
  }
});
