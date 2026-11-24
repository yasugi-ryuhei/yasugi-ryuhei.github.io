// シャンテン数・待ち牌・受け入れの計算
// counts: 34種の枚数の配列（赤ドラは普通の5として数える）
(function (root) {
  'use strict';

  // 一般形（4面子1雀頭）。fixed は鳴いた面子の数
  function regular(counts, fixed) {
    var c = counts.slice(), best = 8;
    function dfs(i, m, t, pair) {
      while (i < 34 && c[i] === 0) i++;
      if (i >= 34) {
        var tt = m + t > 4 ? 4 - m : t;
        var s = 8 - 2 * m - tt - (pair ? 1 : 0);
        if (s < best) best = s;
        return;
      }
      var suited = i < 27, n = i % 9;
      if (c[i] >= 3) { c[i] -= 3; dfs(i, m + 1, t, pair); c[i] += 3; }
      if (suited && n <= 6 && c[i + 1] && c[i + 2]) {
        c[i]--; c[i + 1]--; c[i + 2]--; dfs(i, m + 1, t, pair); c[i]++; c[i + 1]++; c[i + 2]++;
      }
      if (c[i] >= 2) {
        c[i] -= 2;
        if (!pair) dfs(i, m, t, true);
        dfs(i, m, t + 1, pair);
        c[i] += 2;
      }
      if (suited && n <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; dfs(i, m, t + 1, pair); c[i]++; c[i + 1]++; }
      if (suited && n <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; dfs(i, m, t + 1, pair); c[i]++; c[i + 2]++; }
      var keep = c[i]; c[i] = 0; dfs(i + 1, m, t, pair); c[i] = keep; // この牌を使わない
    }
    dfs(0, fixed, 0, false);
    return best;
  }

  function chiitoi(counts) {
    var pairs = 0, kinds = 0;
    for (var i = 0; i < 34; i++) { if (counts[i] >= 2) pairs++; if (counts[i] >= 1) kinds++; }
    return 6 - pairs + Math.max(0, 7 - kinds);
  }

  function kokushi(counts) {
    var kinds = 0, pair = 0;
    [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33].forEach(function (t) {
      if (counts[t] >= 1) kinds++;
      if (counts[t] >= 2) pair = 1;
    });
    return 13 - kinds - pair;
  }

  // -1 なら和了形、0 ならテンパイ
  function shanten(counts) {
    var n = counts.reduce(function (a, b) { return a + b; }, 0);
    var fixed = Math.floor((14 - n) / 3);
    var s = regular(counts, fixed);
    if (fixed === 0) s = Math.min(s, chiitoi(counts), kokushi(counts));
    return s;
  }

  // 引くとシャンテン数が進む牌と、その残り枚数
  function ukeire(counts, usable) {
    var cur = shanten(counts), tiles = [], total = 0;
    for (var t = 0; t < 34; t++) {
      if (counts[t] >= 4 || (usable && !usable(t))) continue;
      counts[t]++;
      if (shanten(counts) < cur) { tiles.push({ tile: t, left: 5 - counts[t] }); total += 5 - counts[t]; }
      counts[t]--;
    }
    return { shanten: cur, tiles: tiles, total: total };
  }

  // 14枚のとき: 何を切るとどうなるか
  function discards(counts, usable) {
    var out = [];
    for (var t = 0; t < 34; t++) {
      if (!counts[t]) continue;
      counts[t]--;
      var u = ukeire(counts, usable);
      counts[t]++;
      out.push({ discard: t, shanten: u.shanten, tiles: u.tiles, total: u.total });
    }
    return out.sort(function (a, b) { return a.shanten - b.shanten || b.total - a.total; });
  }

  var api = { shanten: shanten, ukeire: ukeire, discards: discards };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJShanten = api;
})(typeof self !== 'undefined' ? self : this);
