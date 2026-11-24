// ルール設定（端末に保存する）
(function (root) {
  'use strict';
  var KEY = 'mj-drill-rules-v1';
  var PRESETS = {
    standard: { preset: 'standard', players: 4, aka: 3, kuitan: true, kiriage: false, round1000: false, tsumoLoss: true, doubleWindFu: 4 },
    sanma: { preset: 'sanma', players: 3, aka: 2, kuitan: true, kiriage: false, round1000: false, tsumoLoss: true, doubleWindFu: 4 }
  };
  // 設定画面の項目。options は [値, 表示]
  var ITEMS = [
    { key: 'aka', label: '赤ドラ', options: [[0, 'なし'], [2, '2枚'], [3, '3枚'], [4, '4枚']], help: '赤い5の牌。1枚につき1翻増えます' },
    { key: 'kuitan', label: '喰いタン', options: [[true, 'あり'], [false, 'なし']], help: '鳴いたタンヤオを役として認めるか' },
    { key: 'kiriage', label: '切り上げ満貫', options: [[false, 'なし'], [true, 'あり']], help: '30符4翻と60符3翻を満貫にする' },
    { key: 'round1000', label: '点数の単位', options: [[false, '100点'], [true, '1000点']], help: '1000点にすると、支払いを1000点単位に切り上げます' },
    { key: 'tsumoLoss', label: 'ツモ損', options: [[true, 'あり'], [false, 'なし']], help: '三人麻雀のツモ。なしは、いない1人の分を2人で折半', only3: true },
    { key: 'doubleWindFu', label: '連風牌の雀頭', options: [[4, '4符'], [2, '2符']], help: '場風と自風が重なる牌を雀頭にしたとき' }
  ];

  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.players) return Object.assign(copy(PRESETS.standard), saved);
    } catch (e) { /* 読めなければ標準に戻す */ }
    return copy(PRESETS.standard);
  }
  function save(rules) {
    try { localStorage.setItem(KEY, JSON.stringify(rules)); } catch (e) { /* 保存できなくても続行 */ }
  }
  function summary(r) {
    return [r.players === 3 ? '三人麻雀' : '四人麻雀', r.aka ? '赤' + r.aka + '枚' : '赤なし',
      r.round1000 ? '1000点単位' : null, r.kiriage ? '切り上げ満貫' : null,
      r.kuitan ? null : '喰いタンなし', r.players === 3 && !r.tsumoLoss ? 'ツモ損なし' : null]
      .filter(Boolean).join('・');
  }
  // 三人麻雀では二萬〜八萬を使わない
  function usable(rules) {
    return function (t) { return !(rules.players === 3 && t >= 1 && t <= 7); };
  }

  var api = { PRESETS: PRESETS, ITEMS: ITEMS, load: load, save: save, summary: summary, usable: usable, copy: copy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJRules = api;
})(typeof self !== 'undefined' ? self : this);
