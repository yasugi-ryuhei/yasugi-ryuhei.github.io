// 問題の自動生成
(function (root) {
  'use strict';
  var E = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.MJEngine;

  function rand(n) { return Math.floor(Math.random() * n); }
  function chance(p) { return Math.random() < p; }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rand(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // 正解の周辺の点数から、まぎらわしい選択肢を作る
  function makeOptions(score, rules) {
    var answer = score.text, set = {}, list = [];
    set[answer] = true;
    var hans = [score.han - 1, score.han + 1, score.han, score.han, score.han - 2, score.han + 2, score.han + 3];
    var fus = [score.fu, score.fu, score.fu + 10, score.fu - 10, score.fu, score.fu + 20, score.fu];
    var cands = [];
    for (var i = 0; i < hans.length; i++) {
      var h = Math.min(Math.max(hans[i], 1), 13), f = Math.max(fus[i], 20);
      if (f === 20 && !score.isTsumo) f = 30;
      cands.push(E.calcScore(h, f, score.isDealer, score.isTsumo, 0, rules).text);
    }
    cands.push(E.calcScore(Math.min(score.han, 13), score.fu, !score.isDealer, false, 0, rules).text);
    [1, 2, 3, 4, 5, 6, 8, 11, 13].forEach(function (h) {
      cands.push(E.calcScore(h, 30, score.isDealer, score.isTsumo, 0, rules).text);
      cands.push(E.calcScore(h, 30, !score.isDealer, score.isTsumo, 0, rules).text);
    });
    for (var k = 0; k < cands.length && list.length < 3; k++) {
      // ツモの問題にロンの形の選択肢が混ざらないようにする
      var sameShape = score.isTsumo ? /[-オ]/.test(cands[k]) : /^\d+$/.test(cands[k]);
      if (!set[cands[k]] && sameShape) { set[cands[k]] = true; list.push(cands[k]); }
    }
    list.push(answer);
    return list.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10) || a.length - b.length; });
  }

  // モード1: 翻と符から点数を答える
  function makeTableQuestion(rules) {
    rules = rules || E.DEFAULT_RULES;
    var isDealer = chance(0.3), isTsumo = chance(0.4);
    var han = pick([1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 7, 8]);
    var fu = pick([30, 30, 30, 40, 40, 50, 20, 25, 60, 70]);
    if (fu === 20) { isTsumo = true; if (han < 2) han = 2; }   // 20符は平和ツモだけ
    if (fu === 25 && han < 2) han = 2;                          // 七対子は2翻から
    if (fu === 25 && han === 2) isTsumo = false;                // 七対子ツモは3翻から
    var score = E.calcScore(han, fu, isDealer, isTsumo, 0, rules);
    return { type: 'table', han: han, fu: fu, isDealer: isDealer, isTsumo: isTsumo,
      score: score, answer: score.text, options: makeOptions(score, rules) };
  }

  function buildHand(rules) {
    var three = rules.players === 3;
    var counts = new Array(34).fill(0);
    var style = pick(['any', 'any', 'any', 'any', 'tanyao', 'tanyao', 'honitsu', 'yakuhai', 'yakuhai', 'toitoi', 'chiitoi', 'pinfu', 'pinfu']);
    var mainSuit = rand(3);
    function allowed(t) {
      if (three && t >= 1 && t <= 7) return false;
      if (three && rules.nukidora && t === 30) return false; // 北は抜くので手牌に入れない
      if (style === 'tanyao') return !E.isYaochu(t);
      if (style === 'honitsu') return E.suitOf(t) === mainSuit || E.isHonor(t);
      return true;
    }
    function take(tiles) {
      for (var i = 0; i < tiles.length; i++) {
        if (!allowed(tiles[i])) return false;
        counts[tiles[i]]++;
      }
      var ok = counts.every(function (c) { return c <= 4; });
      if (!ok) tiles.forEach(function (t) { counts[t]--; });
      return ok;
    }
    function tryTake(tiles) {
      var before = counts.slice();
      if (take(tiles)) return true;
      counts = before;
      return false;
    }

    if (style === 'chiitoi') {
      var pool = shuffle(Array.from({ length: 34 }, function (_, i) { return i; }).filter(allowed)).slice(0, 7);
      var closed = [];
      pool.forEach(function (t) { closed.push(t, t); });
      return { groups: null, closed: closed, melds: [] };
    }

    var groups = [], guard = 0;
    var seqRate = style === 'toitoi' ? 0 : style === 'pinfu' ? 1 : 0.75;
    if (style === 'yakuhai') {
      var y = pick([31, 32, 33, 27, 28]);
      take([y, y, y]);
      groups.push({ type: 'tri', tile: y });
    }
    while (groups.length < 4 && guard++ < 200) {
      if (chance(seqRate)) {
        var s = rand(3) * 9 + rand(7);
        if (tryTake([s, s + 1, s + 2])) groups.push({ type: 'seq', tile: s });
      } else {
        var t = rand(34);
        var isKan = chance(0.08);
        if (tryTake(isKan ? [t, t, t, t] : [t, t, t])) groups.push({ type: isKan ? 'kan' : 'tri', tile: t });
      }
    }
    var pair = -1;
    while (pair < 0 && guard++ < 400) {
      var p = rand(34);
      if (tryTake([p, p])) pair = p;
    }
    if (groups.length < 4 || pair < 0) return null;

    // 鳴きを決める
    var openHand = style === 'pinfu' ? false : chance(style === 'toitoi' || style === 'honitsu' ? 0.7 : 0.3);
    var melds = [], closedTiles = [pair, pair], closedGroups = [];
    var openLeft = openHand ? 1 + rand(2) : 0;
    shuffle(groups).forEach(function (g) {
      if (g.type === 'kan') {
        var open = openHand && chance(0.5);
        melds.push({ type: open ? 'minkan' : 'ankan', tiles: [g.tile, g.tile, g.tile, g.tile] });
      } else if (openLeft > 0) {
        openLeft--;
        if (g.type === 'seq' && three) { closedGroups.push(g); closedTiles.push(g.tile, g.tile + 1, g.tile + 2); return; } // 三人麻雀はチーなし
        melds.push(g.type === 'seq'
          ? { type: 'chi', tiles: [g.tile, g.tile + 1, g.tile + 2] }
          : { type: 'pon', tiles: [g.tile, g.tile, g.tile] });
      } else {
        closedGroups.push(g);
        if (g.type === 'seq') closedTiles.push(g.tile, g.tile + 1, g.tile + 2);
        else closedTiles.push(g.tile, g.tile, g.tile);
      }
    });
    return { closed: closedTiles, melds: melds, counts: counts };
  }

  // モード2: 手牌から点数を答える
  // 手牌の5を、ルールの枚数に応じて赤ドラに変える
  function applyAka(hand, rules) {
    var perSuit = { 0: [0, 0, 0], 2: [0, 1, 1], 3: [1, 1, 1], 4: [1, 2, 1] }[rules.aka] || [0, 0, 0];
    if (rules.players === 3) perSuit[0] = 0;
    function conv(t) {
      if (t >= 27 || t % 9 !== 4) return t;
      var s = Math.floor(t / 9);
      if (perSuit[s] > 0 && chance(perSuit[s] / 4 + 0.15)) { perSuit[s]--; return 34 + s; }
      return t;
    }
    hand.closed = hand.closed.map(conv);
    hand.winTile = conv(hand.winTile);
    hand.melds.forEach(function (m) { m.tiles = m.tiles.map(conv); });
  }

  function makeHandQuestion(rules) {
    rules = rules || E.DEFAULT_RULES;
    var three = rules.players === 3;
    for (var attempt = 0; attempt < 500; attempt++) {
      var b = buildHand(rules);
      if (!b) continue;
      var closed = b.closed.slice().sort(function (a, c) { return a - c; });
      var winIdx = rand(closed.length);
      var winTile = closed.splice(winIdx, 1)[0];
      var seat = chance(0.28) ? 27 : 28 + rand(three ? 2 : 3);
      var hand = {
        closed: closed, winTile: winTile, melds: b.melds,
        tsumo: chance(0.35), riichi: false,
        seatWind: seat, roundWind: chance(0.7) ? 27 : 28, doraIndicators: []
      };
      if (E.isMenzen(hand)) hand.riichi = chance(0.65);
      // ドラ表示牌（手牌と合わせて4枚を超えないもの）
      var counts = new Array(34).fill(0);
      closed.concat([winTile]).forEach(function (t) { counts[t]++; });
      b.melds.forEach(function (m) { m.tiles.forEach(function (t) { counts[t]++; }); });
      var ind;
      do { ind = rand(34); } while (counts[ind] >= 4 || (three && ind >= 1 && ind <= 7));
      hand.doraIndicators = [ind];
      applyAka(hand, rules);
      if (three && rules.nukidora) hand.nuki = pick([0, 0, 0, 1, 1, 2, 3]);

      var result = E.evaluate(hand, rules);
      if (!result) continue;
      if (result.yakuman && chance(0.9)) continue; // 役満はたまにだけ出す
      if (result.han >= 8 && !result.yakuman && chance(0.7)) continue;
      return { type: 'hand', hand: hand, result: result, score: result.score,
        answer: result.score.text, options: makeOptions(result.score, rules) };
    }
    throw new Error('問題を作れませんでした');
  }

  var api = { makeTableQuestion: makeTableQuestion, makeHandQuestion: makeHandQuestion, makeOptions: makeOptions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJGenerator = api;
})(typeof self !== 'undefined' ? self : this);
