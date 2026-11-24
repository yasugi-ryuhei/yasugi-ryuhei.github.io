// 麻雀の役判定・符計算・点数計算
// 牌番号: 0-8 萬子, 9-17 筒子, 18-26 索子, 27-30 東南西北, 31-33 白發中
(function (root) {
  'use strict';

  var EAST = 27, HAKU = 31, HATSU = 32, CHUN = 33;
  var WIND_NAMES = ['東', '南', '西', '北'];
  // 赤ドラは 34=赤五萬, 35=赤五筒, 36=赤五索 で表す
  var DEFAULT_RULES = { players: 4, aka: 0, kuitan: true, kiriage: false, round1000: false, tsumoLoss: true, doubleWindFu: 4, doubleYakuman: false };
  var DOUBLE_YAKUMAN = ['四暗刻単騎', '大四喜', '純正九蓮宝燈', '国士無双十三面待ち'];
  function baseTile(t) { return t >= 34 ? [4, 13, 22][t - 34] : t; }

  function isHonor(t) { return t >= 27; }
  function suitOf(t) { return t >= 27 ? 3 : Math.floor(t / 9); }
  function numOf(t) { return t >= 27 ? -1 : t % 9; } // 0-8
  function isTerminal(t) { return t < 27 && (t % 9 === 0 || t % 9 === 8); }
  function isYaochu(t) { return isHonor(t) || isTerminal(t); }
  function doraFromIndicator(ind, rules) {
    ind = baseTile(ind);
    if (rules && rules.players === 3 && ind < 9) return ind === 0 ? 8 : 0; // 三人麻雀は一萬と九萬だけ
    if (ind < 27) return Math.floor(ind / 9) * 9 + ((ind % 9) + 1) % 9;
    if (ind <= 30) return 27 + ((ind - 27 + 1) % 4);
    return 31 + ((ind - 31 + 1) % 3);
  }


  // 翻・符から点数を出す
  function calcScore(han, fu, isDealer, isTsumo, yakumanCount, rules) {
    rules = rules || DEFAULT_RULES;
    var unit = rules.round1000 ? 1000 : 100;
    function up(n) { return Math.ceil(n / unit) * unit; }
    var three = rules.players === 3, noLoss = three && !rules.tsumoLoss;
    var base, limit = '';
    if (yakumanCount) { base = 8000 * yakumanCount; limit = yakumanCount === 1 ? '役満' : yakumanCount === 2 ? 'ダブル役満' : yakumanCount === 3 ? 'トリプル役満' : yakumanCount + '倍役満'; }
    else if (han >= 13) { base = 8000; limit = '数え役満'; }
    else if (han >= 11) { base = 6000; limit = '三倍満'; }
    else if (han >= 8) { base = 4000; limit = '倍満'; }
    else if (han >= 6) { base = 3000; limit = '跳満'; }
    else {
      base = fu * Math.pow(2, han + 2);
      if (han >= 5 || base >= 2000) { base = 2000; limit = '満貫'; }
      else if (rules.kiriage && ((han === 4 && fu === 30) || (han === 3 && fu === 60))) { base = 2000; limit = '満貫'; }
    }
    var res = { han: han, fu: fu, base: base, limit: limit, isDealer: isDealer, isTsumo: isTsumo };
    if (!isTsumo) {
      res.total = up(base * (isDealer ? 6 : 4));
      res.text = String(res.total);
    } else if (isDealer) {
      // ツモ損なしの三人麻雀は、いない1人の分を2人で折半する
      res.each = up(base * (noLoss ? 3 : 2));
      res.total = res.each * (three ? 2 : 3);
      res.text = res.each + 'オール';
    } else {
      res.fromChild = up(base * (noLoss ? 1.5 : 1));
      res.fromDealer = up(base * (noLoss ? 2.5 : 2));
      res.total = three ? res.fromChild + res.fromDealer : res.fromChild * 2 + res.fromDealer;
      res.text = res.fromChild + '-' + res.fromDealer;
    }
    return res;
  }

  // 門前部分（雀頭を抜いた後）を面子に分解する。全通りを返す
  function decomposeMelds(counts, from, need, acc, out) {
    if (need === 0) {
      for (var k = 0; k < 34; k++) if (counts[k]) return;
      out.push(acc.slice());
      return;
    }
    var i = from;
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) return;
    if (counts[i] >= 3) {
      counts[i] -= 3;
      acc.push({ type: 'tri', tile: i, open: false });
      decomposeMelds(counts, i, need - 1, acc, out);
      acc.pop();
      counts[i] += 3;
    }
    if (i < 27 && i % 9 <= 6 && counts[i + 1] && counts[i + 2]) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      acc.push({ type: 'seq', tile: i, open: false });
      decomposeMelds(counts, i, need - 1, acc, out);
      acc.pop();
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }
  }

  function meldToGroup(m) {
    if (m.type === 'chi') return { type: 'seq', tile: Math.min.apply(null, m.tiles), open: true, called: true };
    if (m.type === 'pon') return { type: 'tri', tile: m.tiles[0], open: true, called: true };
    if (m.type === 'minkan') return { type: 'kan', tile: m.tiles[0], open: true, called: true };
    return { type: 'kan', tile: m.tiles[0], open: false, called: true }; // 暗槓
  }

  function allTiles(hand) {
    var tiles = hand.closed.concat([hand.winTile]);
    (hand.melds || []).forEach(function (m) { tiles = tiles.concat(m.tiles); });
    return tiles;
  }

  function isMenzen(hand) {
    return (hand.melds || []).every(function (m) { return m.type === 'ankan'; });
  }

  function countDora(hand) {
    var tiles = allTiles(hand), n = 0;
    (hand.doraIndicators || []).forEach(function (ind) {
      var d = doraFromIndicator(ind, hand._rules);
      if (d === 30) n += hand.nuki; // 抜いた北がドラのときは、その分も数える
      tiles.forEach(function (t) { if (t === d) n++; });
    });
    return n;
  }

  function yakuhaiValue(t, hand) {
    var v = 0;
    if (t >= HAKU) v++;
    if (t === hand.seatWind) v++;
    if (t === hand.roundWind) v++;
    return v;
  }

  // 1つの分解・1つの待ち方について役と符を出す
  function evalPattern(hand, pair, groups, wait, menzen) {
    var yaku = [], yakuman = [];
    var tiles = allTiles(hand);
    var tris = groups.filter(function (g) { return g.type !== 'seq'; });
    var seqs = groups.filter(function (g) { return g.type === 'seq'; });
    var concealedTris = tris.filter(function (g) { return !g.open; }).length;
    var kans = groups.filter(function (g) { return g.type === 'kan'; }).length;
    function add(name, closedHan, openHan) {
      var h = menzen ? closedHan : openHan;
      if (h > 0) yaku.push({ name: name, han: h });
    }

    // 役満
    var dragonTris = tris.filter(function (g) { return g.tile >= HAKU; }).length;
    var windTris = tris.filter(function (g) { return g.tile >= EAST && g.tile <= 30; }).length;
    if (concealedTris === 4) yakuman.push(wait === 'tanki' ? '四暗刻単騎' : '四暗刻');
    if (dragonTris === 3) yakuman.push('大三元');
    if (windTris === 4) yakuman.push('大四喜');
    else if (windTris === 3 && pair >= EAST && pair <= 30) yakuman.push('小四喜');
    if (tiles.every(isHonor)) yakuman.push('字一色');
    if (tiles.every(isTerminal)) yakuman.push('清老頭');
    if (tiles.every(function (t) { return [19, 20, 21, 23, 25, HATSU].indexOf(t) >= 0; })) yakuman.push('緑一色');
    if (kans === 4) yakuman.push('四槓子');
    if (menzen && !(hand.melds || []).length && suitOf(tiles[0]) < 3 &&
        tiles.every(function (t) { return suitOf(t) === suitOf(tiles[0]); })) {
      var c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      tiles.forEach(function (t) { c[numOf(t)]++; });
      if (c[0] >= 3 && c[8] >= 3 && c.slice(1, 8).every(function (x) { return x >= 1; })) {
        // 和了牌を除いた13枚が 1112345678999 なら純正（9面待ち）
        c[numOf(hand.winTile)]--;
        yakuman.push(c.join('') === '311111113' ? '純正九蓮宝燈' : '九蓮宝燈');
      }
    }

    // 符
    var fuItems = [{ label: '副底', fu: 20 }];
    var pairFu = yakuhaiValue(pair, hand) * 2;
    if (pairFu === 4 && hand._rules.doubleWindFu === 2) pairFu = 2;
    var isPinfuShape = seqs.length === 4 && pairFu === 0 && wait === 'ryanmen';
    var pinfu = menzen && isPinfuShape;
    groups.forEach(function (g) {
      if (g.type === 'seq') return;
      var f = g.type === 'kan' ? 8 : 2;
      if (!g.open) f *= 2;
      if (isYaochu(g.tile)) f *= 2;
      var kind = g.type === 'kan' ? (g.open ? '明槓' : '暗槓') : (g.open ? '明刻' : '暗刻');
      g.fu = f; g.kind = kind;
      fuItems.push({ label: tileName(g.tile) + 'の' + kind, fu: f, group: true });
    });
    if (pairFu) fuItems.push({ label: '役牌の雀頭', fu: pairFu, group: true });
    var waitLabels = { tanki: '単騎待ち', kanchan: 'カンチャン待ち', penchan: 'ペンチャン待ち' };
    if (waitLabels[wait]) fuItems.push({ label: waitLabels[wait], fu: 2 });
    if (hand.tsumo && !pinfu) fuItems.push({ label: 'ツモ', fu: 2 });
    if (!hand.tsumo && menzen) fuItems.push({ label: '門前ロン', fu: 10 });
    var rawFu = fuItems.reduce(function (s, x) { return s + x.fu; }, 0);
    var fu = Math.ceil(rawFu / 10) * 10;
    if (!menzen && rawFu === 20) { fuItems.push({ label: '鳴いた平和形は30符', fu: 10 }); fu = 30; }

    // 通常役
    if (hand.riichi && menzen) add('立直', 1, 0);
    if (hand.tsumo && menzen) add('門前清自摸和', 1, 0);
    if (pinfu) add('平和', 1, 0);
    if (!tiles.some(isYaochu)) add('断么九', 1, hand._rules.kuitan ? 1 : 0);
    if (menzen) {
      var seqCount = {};
      seqs.forEach(function (g) { seqCount[g.tile] = (seqCount[g.tile] || 0) + 1; });
      var pairsOfSeq = 0;
      Object.keys(seqCount).forEach(function (k) { pairsOfSeq += Math.floor(seqCount[k] / 2); });
      if (pairsOfSeq === 2) add('二盃口', 3, 0);
      else if (pairsOfSeq === 1) add('一盃口', 1, 0);
    }
    tris.forEach(function (g) {
      if (g.tile === HAKU) add('役牌 白', 1, 1);
      if (g.tile === HATSU) add('役牌 發', 1, 1);
      if (g.tile === CHUN) add('役牌 中', 1, 1);
      if (g.tile === hand.roundWind) add('場風 ' + tileName(g.tile), 1, 1);
      if (g.tile === hand.seatWind) add('自風 ' + tileName(g.tile), 1, 1);
    });
    // 三色同順・一気通貫
    var seqStarts = seqs.map(function (g) { return g.tile; });
    for (var n = 0; n < 7; n++) {
      if (seqStarts.indexOf(n) >= 0 && seqStarts.indexOf(n + 9) >= 0 && seqStarts.indexOf(n + 18) >= 0) {
        add('三色同順', 2, 1); break;
      }
    }
    for (var s = 0; s < 3; s++) {
      if (seqStarts.indexOf(s * 9) >= 0 && seqStarts.indexOf(s * 9 + 3) >= 0 && seqStarts.indexOf(s * 9 + 6) >= 0) {
        add('一気通貫', 2, 1); break;
      }
    }
    // 三色同刻
    var triTiles = tris.map(function (g) { return g.tile; });
    for (var m = 0; m < 9; m++) {
      if (triTiles.indexOf(m) >= 0 && triTiles.indexOf(m + 9) >= 0 && triTiles.indexOf(m + 18) >= 0) {
        add('三色同刻', 2, 2); break;
      }
    }
    if (tris.length === 4) add('対々和', 2, 2);
    if (concealedTris === 3) add('三暗刻', 2, 2);
    if (kans === 3) add('三槓子', 2, 2);
    if (dragonTris === 2 && pair >= HAKU) add('小三元', 2, 2);
    // チャンタ系
    var allGroupsYaochu = isYaochu(pair) && groups.every(function (g) {
      if (g.type === 'seq') return numOf(g.tile) === 0 || numOf(g.tile) === 6;
      return isYaochu(g.tile);
    });
    if (allGroupsYaochu) {
      if (seqs.length === 0) add('混老頭', 2, 2);
      else if (tiles.some(isHonor)) add('混全帯么九', 2, 1);
      else add('純全帯么九', 3, 2);
    }
    // 染め手
    var suits = {};
    tiles.forEach(function (t) { suits[suitOf(t)] = true; });
    var numSuits = [0, 1, 2].filter(function (x) { return suits[x]; }).length;
    if (numSuits === 1) {
      if (suits[3]) add('混一色', 3, 2); else add('清一色', 6, 5);
    }

    var r = finish(hand, yaku, yakuman, fu, fuItems, pair, groups, wait);
    if (r) r.pairFu = pairFu;
    return r;
  }

  function finish(hand, yaku, yakuman, fu, fuItems, pair, groups, wait) {
    var isDealer = hand.seatWind === EAST, f = hand.flags, menzen = isMenzen(hand);
    // 状況でつく役
    if (hand.doubleRiichi) yaku.forEach(function (y) { if (y.name === '立直') { y.name = 'ダブル立直'; y.han = 2; } });
    if (f.ippatsu && hand.riichi && menzen) yaku.push({ name: '一発', han: 1 });
    if (f.rinshan && hand.tsumo) yaku.push({ name: '嶺上開花', han: 1 });
    if (f.chankan && !hand.tsumo) yaku.push({ name: '槍槓', han: 1 });
    if (f.haitei) yaku.push({ name: hand.tsumo ? '海底摸月' : '河底撈魚', han: 1 });
    if (f.tenhou && hand.tsumo && menzen && !(hand.melds || []).length) yakuman.push(isDealer ? '天和' : '地和');
    if (yakuman.length) {
      var ym = 0;
      yakuman.forEach(function (n) { ym += hand._rules.doubleYakuman && DOUBLE_YAKUMAN.indexOf(n) >= 0 ? 2 : 1; });
      return {
        yaku: yakuman.map(function (n) { return { name: n, han: 13 }; }), yakuman: ym,
        han: 13 * ym, yakuHan: 13 * ym, dora: 0, fu: fu, fuItems: fuItems,
        aka: 0, score: calcScore(13 * ym, fu, isDealer, hand.tsumo, ym, hand._rules), pair: pair, groups: groups, wait: wait
      };
    }
    var yakuHan = yaku.reduce(function (s2, y) { return s2 + y.han; }, 0);
    if (yakuHan === 0) return null;
    var dora = countDora(hand) + hand.extraDora;
    var han = yakuHan + dora + hand._aka + hand.nuki;
    return {
      yaku: yaku, yakuman: 0, han: han, yakuHan: yakuHan, dora: dora, aka: hand._aka, nuki: hand.nuki, fu: fu, fuItems: fuItems,
      score: calcScore(han, fu, isDealer, hand.tsumo, 0, hand._rules), pair: pair, groups: groups, wait: wait
    };
  }

  function better(a, b) {
    if (!b) return true;
    if (a.score.total !== b.score.total) return a.score.total > b.score.total;
    if (a.han !== b.han) return a.han > b.han;
    return a.fu > b.fu;
  }

  // 手牌を評価して最も高い解釈を返す。役がなければ null
  function evaluate(src, rules) {
    // 赤ドラを普通の5に直してから判定する
    var aka = 0;
    function norm(t) { if (t >= 34) aka++; return baseTile(t); }
    var hand = {
      closed: src.closed.map(norm), winTile: norm(src.winTile),
      melds: (src.melds || []).map(function (m) { return { type: m.type, tiles: m.tiles.map(norm) }; }),
      tsumo: src.tsumo, riichi: src.riichi, seatWind: src.seatWind, roundWind: src.roundWind,
      doraIndicators: src.doraIndicators || [], _rules: rules || DEFAULT_RULES,
      flags: src.flags || {}, doubleRiichi: !!src.doubleRiichi && !!src.riichi, extraDora: src.extraDora || 0,
      nuki: (rules && rules.players === 3 && rules.nukidora && src.nuki) || 0
    };
    hand._aka = aka;
    var melds = hand.melds || [];
    var menzen = isMenzen(hand);
    var counts = new Array(34).fill(0);
    hand.closed.forEach(function (t) { counts[t]++; });
    counts[hand.winTile]++;
    var best = null;
    var needMelds = 4 - melds.length;
    var calledGroups = melds.map(meldToGroup);

    // 七対子
    if (melds.length === 0) {
      var pairs = 0;
      for (var i = 0; i < 34; i++) if (counts[i] === 2) pairs++;
      if (pairs === 7) {
        var tiles = allTiles(hand), yaku = [{ name: '七対子', han: 2 }], yakuman = [];
        if (tiles.every(isHonor)) yakuman.push('字一色');
        if (hand.riichi) yaku.push({ name: '立直', han: 1 });
        if (hand.tsumo) yaku.push({ name: '門前清自摸和', han: 1 });
        if (!tiles.some(isYaochu)) yaku.push({ name: '断么九', han: 1 });
        if (tiles.every(isYaochu)) yaku.push({ name: '混老頭', han: 2 });
        var su = {};
        tiles.forEach(function (t) { su[suitOf(t)] = true; });
        var ns = [0, 1, 2].filter(function (x) { return su[x]; }).length;
        if (ns === 1) yaku.push(su[3] ? { name: '混一色', han: 3 } : { name: '清一色', han: 6 });
        best = finish(hand, yaku, yakuman, 25, [{ label: '七対子は25符固定', fu: 25 }], -1, [], 'tanki');
      }
    }

    // 国士無双
    var KOKUSHI = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    if (melds.length === 0 && KOKUSHI.every(function (t) { return counts[t] >= 1; }) &&
        KOKUSHI.reduce(function (a, t) { return a + counts[t]; }, 0) === 14) {
      best = finish(hand, [], [counts[hand.winTile] === 2 ? '国士無双十三面待ち' : '国士無双'], 30, [], -1, [], 'tanki');
    }

    for (var p = 0; p < 34; p++) {
      if (counts[p] < 2) continue;
      counts[p] -= 2;
      var outs = [];
      decomposeMelds(counts, 0, needMelds, [], outs);
      counts[p] += 2;
      outs.forEach(function (closedGroups) {
        // 和了牌がどこに入ったかの全パターン
        var placements = [];
        if (p === hand.winTile) placements.push({ idx: -1, wait: 'tanki' });
        closedGroups.forEach(function (g, idx) {
          if (g.type === 'tri' && g.tile === hand.winTile) placements.push({ idx: idx, wait: 'shanpon' });
          if (g.type === 'seq' && hand.winTile >= g.tile && hand.winTile <= g.tile + 2) {
            var pos = hand.winTile - g.tile, w;
            if (pos === 1) w = 'kanchan';
            else if ((pos === 2 && numOf(g.tile) === 0) || (pos === 0 && numOf(g.tile) === 6)) w = 'penchan';
            else w = 'ryanmen';
            placements.push({ idx: idx, wait: w });
          }
        });
        placements.forEach(function (pl) {
          var groups = closedGroups.map(function (g, idx) {
            // 鳴いた面子は毎回作り直す（符の書き込みが他の解釈に残らないように）
            // ロンで完成した刻子は明刻扱い
            var open = !hand.tsumo && pl.idx === idx && g.type === 'tri';
            return { type: g.type, tile: g.tile, open: open, win: pl.idx === idx };
          }).concat(melds.map(meldToGroup));
          var r = evalPattern(hand, p, groups, pl.wait, menzen);
          if (r && better(r, best)) best = r;
        });
      });
    }
    return best;
  }

  function tileName(t) {
    if (t >= 34) return '赤五' + '萬筒索'[t - 34];
    if (t < 27) return '一二三四五六七八九'[t % 9] + '萬筒索'[Math.floor(t / 9)];
    return '東南西北白發中'[t - 27];
  }

  var api = {
    evaluate: evaluate, calcScore: calcScore, doraFromIndicator: doraFromIndicator,
    tileName: tileName, isYaochu: isYaochu, isHonor: isHonor, suitOf: suitOf, numOf: numOf,
    isMenzen: isMenzen, WIND_NAMES: WIND_NAMES, EAST: EAST, DEFAULT_RULES: DEFAULT_RULES, baseTile: baseTile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJEngine = api;
})(typeof self !== 'undefined' ? self : this);
