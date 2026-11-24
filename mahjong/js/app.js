// 画面の動き
(function () {
  'use strict';
  var E = window.MJEngine, G = window.MJGenerator, T = window.MJTiles, S = window.MJShanten, R = window.MJRules;
  var $ = function (id) { return document.getElementById(id); };
  var MODE = Number(document.body.dataset.players) === 3 ? 3 : 4; // ページで四麻か三麻かが決まる
  var STORE_KEY = 'mj-drill-stats-v1' + (MODE === 3 ? '-sanma' : '');
  var VIEWS = ['yaku', 'table', 'calc', 'machi', 'practice', 'rules'];
  var rules = R.load(MODE);
  var state = { mode: null, question: null, answered: false, session: { total: 0, correct: 0, streak: 0 } };
  // 待ち牌ツールの初期表示（筒子・索子・東だけなので三人麻雀でも使える）
  var machi = { tiles: [12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 27, 27] };

  function tiles(list, opts) { return list.map(function (t) { return T.tileSVG(t, opts); }).join(''); }

  // ---------- タブ ----------
  // ページごとに1つの機能を表示する（body の data-view で決まる）
  function show(view) {
    if (view === 'practice') renderHome();
    if (view === 'machi') renderMachi();
    if (view === 'table') renderTable();
    if (view === 'calc') renderCalc();
    if (view === 'yaku') renderYaku();
    if (view === 'rules') renderRules();
  }

  // ---------- 成績 ----------
  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function record(mode, ok) {
    var stats = loadStats();
    var s = stats[mode] || { total: 0, correct: 0, best: 0 };
    s.total++;
    if (ok) s.correct++;
    s.best = Math.max(s.best, state.session.streak);
    stats[mode] = s;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* 保存できなくても続行 */ }
  }

  // ---------- 練習 ----------
  function renderHome() {
    var stats = loadStats();
    ['table', 'hand'].forEach(function (m) {
      var s = stats[m];
      $('stat-' + m).textContent = s && s.total
        ? '正解率 ' + Math.round(s.correct / s.total * 100) + '%・' + s.total + '問'
        : '';
    });
    $('rule-summary').textContent = R.summary(rules);
    $('art-hand').innerHTML = tiles([12, 13, 14, 32, 32]);
    $('home').hidden = false;
    $('quiz').hidden = true;
  }

  function start(mode) {
    state.mode = mode;
    state.session = { total: 0, correct: 0, streak: 0 };
    $('home').hidden = true;
    $('quiz').hidden = false;
    next();
    window.scrollTo(0, 0);
  }

  function next() {
    state.question = state.mode === 'table' ? G.makeTableQuestion(rules) : G.makeHandQuestion(rules);
    state.answered = false;
    renderQuestion();
  }

  function chip(text, cls) { return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + text + '</span>'; }

  function renderQuestion() {
    var q = state.question, html = '';
    if (q.type === 'table') {
      html += '<div class="chips">' + chip(q.isDealer ? '親' : '子', q.isDealer ? 'dealer' : '') +
        chip(q.isTsumo ? 'ツモ' : 'ロン') + '</div>';
      html += '<p class="big-q"><span>' + q.fu + '</span>符 <span>' + q.han + '</span>翻</p>';
    } else {
      var h = q.hand, dealer = h.seatWind === 27;
      html += '<div class="chips">' + chip(E.WIND_NAMES[h.roundWind - 27] + '場') +
        chip(E.WIND_NAMES[h.seatWind - 27] + '家・' + (dealer ? '親' : '子'), dealer ? 'dealer' : '') +
        (h.riichi ? chip('リーチ', 'riichi') : '') + chip(h.tsumo ? 'ツモ' : 'ロン') +
        (h.nuki ? chip('北抜き ' + h.nuki + '枚', 'dora-chip') : '') +
        '<span class="dora">ドラ表示' + tiles(h.doraIndicators) + '</span></div>';
      html += '<div class="hand">' + tiles(h.closed) +
        '<span class="win"><em>' + (h.tsumo ? 'ツモ' : 'ロン') + '</em>' + T.tileSVG(h.winTile) + '</span></div>';
      if (h.melds.length) {
        var names = { chi: 'チー', pon: 'ポン', minkan: '明槓', ankan: '暗槓' };
        html += '<div class="melds">' + h.melds.map(function (m) {
          var ts = m.tiles.map(function (t, i) {
            return T.tileSVG(t, { back: m.type === 'ankan' && (i === 0 || i === 3) });
          }).join('');
          return '<span class="meld"><em>' + names[m.type] + '</em><span>' + ts + '</span></span>';
        }).join('') + '</div>';
      }
    }
    $('question').innerHTML = html;
    $('options').innerHTML = q.options.map(function (o) {
      return '<button type="button" class="option" data-value="' + o + '">' + o + '</button>';
    }).join('');
    $('result').hidden = true;
    $('result').innerHTML = '';
    renderProgress();
  }

  function renderProgress() {
    var s = state.session;
    $('progress').innerHTML = '<b>' + s.correct + '</b> / ' + s.total + ' 問' +
      (s.streak > 1 ? '<span class="streak">' + s.streak + '連続</span>' : '');
  }

  function payText(score) {
    if (!score.isTsumo) return '放銃した人が ' + score.total;
    if (score.isDealer) return '全員 ' + score.each + ' ずつ';
    return '子 ' + score.fromChild + '・親 ' + score.fromDealer;
  }

  function groupTiles(g) {
    if (g.type === 'seq') return [g.tile, g.tile + 1, g.tile + 2];
    return g.type === 'kan' ? [g.tile, g.tile, g.tile, g.tile] : [g.tile, g.tile, g.tile];
  }

  function explain(q) {
    var s = q.score, html = '';
    html += '<div class="answer-line">' + (s.limit
      ? '<span class="limit">' + s.limit + '</span>'
      : '<span><b>' + s.fu + '</b>符</span><span><b>' + s.han + '</b>翻</span>') +
      '<i>→</i><strong>' + s.text + '</strong></div><p class="pay">' + payText(s) + '</p>';

    if (q.type === 'table') {
      if (!s.limit) {
        var mult = s.isTsumo ? '' : ' × ' + (s.isDealer ? 6 : 4) + ' = ' + s.base * (s.isDealer ? 6 : 4);
        html += '<p class="formula">' + s.fu + ' × ' + Math.pow(2, s.han + 2) + ' = ' + s.base + mult + ' → 切り上げ</p>';
      }
      return html;
    }

    var r = q.result;
    html += '<h3>役<em>' + (r.yakuman ? s.limit : r.han + '翻') + '</em></h3><div class="chips">' +
      r.yaku.map(function (y) { return chip(y.name + (r.yakuman ? '' : '<b>' + y.han + '</b>')); }).join('') +
      (r.dora ? chip('ドラ<b>' + r.dora + '</b>', 'dora-chip') : '') +
      (r.aka ? chip('赤ドラ<b>' + r.aka + '</b>', 'dora-chip') : '') +
      (r.nuki ? chip('北抜きドラ<b>' + r.nuki + '</b>', 'dora-chip') : '') + '</div>';

    if (!s.limit) {
      var raw = r.fuItems.reduce(function (a, x) { return a + x.fu; }, 0);
      html += '<h3>符<em>' + (raw !== r.fu ? raw + ' → ' : '') + r.fu + '符</em></h3>';
      if (r.groups.length) {
        html += '<div class="groups">' + r.groups.map(function (g) {
          return '<span class="grp' + (g.fu ? ' has' : '') + '"><span>' + tiles(groupTiles(g)) + '</span>' +
            '<b>' + (g.fu || 0) + '</b><small>' + (g.kind || '順子') + '</small></span>';
        }).join('') + '<span class="grp' + (r.pairFu ? ' has' : '') + '"><span>' + tiles([r.pair, r.pair]) + '</span>' +
          '<b>' + (r.pairFu || 0) + '</b><small>雀頭</small></span></div>';
      }
      html += '<div class="chips">' + r.fuItems.filter(function (f) { return !f.group; }).map(function (f) {
        return chip(f.label + '<b>' + f.fu + '</b>');
      }).join('') + '</div>';
    }
    return html;
  }

  function answer(value) {
    if (state.answered) return;
    state.answered = true;
    var q = state.question, ok = value === q.answer, s = state.session;
    s.total++;
    if (ok) { s.correct++; s.streak++; } else { s.streak = 0; }
    record(state.mode, ok);
    Array.prototype.forEach.call(document.querySelectorAll('.option'), function (b) {
      b.disabled = true;
      if (b.dataset.value === q.answer) b.classList.add('correct');
      else if (b.dataset.value === value) b.classList.add('wrong');
    });
    $('result').innerHTML = '<p class="verdict ' + (ok ? 'ok' : 'ng') + '">' + (ok ? '正解' : '不正解') + '</p>' +
      explain(q) + '<button type="button" id="next" class="primary">次へ</button>';
    $('result').hidden = false;
    $('next').focus({ preventScroll: true });
    renderProgress();
  }

  // ---------- 点数計算機 ----------
  // 初期表示はリーチ・平和・タンヤオの例
  var calc = { tiles: [12, 13, 14, 14, 15, 16, 19, 20, 21, 22, 22, 23, 24, 25], melds: [], mode: 'hand',
    tsumo: false, riichi: 1, seat: 28, round: 27, dora: 0, nuki: 0, flags: {} };
  var MELD_NAMES = { chi: 'チー', pon: 'ポン', minkan: '明槓', ankan: '暗槓' };

  function calcCounts() {
    var c = new Array(34).fill(0);
    calc.tiles.forEach(function (t) { c[t]++; });
    calc.melds.forEach(function (m) { m.tiles.forEach(function (t) { c[t]++; }); });
    return c;
  }
  function calcNeed() { return 14 - calc.melds.length * 3; }
  function meldTiles(mode, t) {
    if (mode === 'chi') return [t, t + 1, t + 2];
    return mode === 'pon' ? [t, t, t] : [t, t, t, t];
  }
  function canAdd(mode, t, counts, usable) {
    if (!usable(t)) return false;
    if (mode === 'hand') return calc.tiles.length < calcNeed() && counts[t] < 4;
    if (calc.melds.length >= 4 || calc.tiles.length > calcNeed() - 3) return false;
    if (mode === 'chi') return t < 27 && t % 9 <= 6 && [t, t + 1, t + 2].every(function (x) { return counts[x] < 4 && usable(x); });
    return counts[t] + (mode === 'pon' ? 3 : 4) <= 4;
  }

  function renderCalc() {
    var usable = R.usable(rules), three = rules.players === 3;
    calc.tiles = calc.tiles.filter(usable);
    if (three) { calc.melds = calc.melds.filter(function (m) { return m.type !== 'chi'; }); if (calc.seat === 30) calc.seat = 28; if (calc.mode === 'chi') calc.mode = 'hand'; }
    var counts = calcCounts(), need = calcNeed(), n = calc.tiles.length;

    // 最後に入れた牌が和了牌
    var body = calc.tiles.slice(0, n === need ? n - 1 : n).sort(function (a, b) { return a - b; });
    function btn(t, i) {
      return '<button type="button" class="tile-btn" data-cremove="' + i + '" aria-label="' + E.tileName(t) + 'を外す">' + T.tileSVG(t) + '</button>';
    }
    var html = body.map(function (t) { return btn(t, calc.tiles.indexOf(t)); }).join('');
    if (n === need) html += '<span class="win"><em>和了牌</em>' + btn(calc.tiles[n - 1], n - 1) + '</span>';
    $('calc-hand').innerHTML = html || '<span class="empty">下の牌をタップして手牌を作る</span>';
    $('calc-melds').hidden = !calc.melds.length;
    $('calc-melds').innerHTML = calc.melds.map(function (m, i) {
      var ts = m.tiles.map(function (t, k) { return T.tileSVG(t, { back: m.type === 'ankan' && (k === 0 || k === 3) }); }).join('');
      return '<button type="button" class="meld meld-btn" data-mremove="' + i + '" aria-label="' + MELD_NAMES[m.type] + 'を外す"><em>' + MELD_NAMES[m.type] + ' ×</em><span>' + ts + '</span></button>';
    }).join('');
    $('calc-count').textContent = n + ' / ' + need + '枚' + (calc.melds.length ? '＋鳴き' + calc.melds.length : '');

    var modes = [['hand', '手牌'], ['pon', 'ポン'], ['chi', 'チー'], ['minkan', '明槓'], ['ankan', '暗槓']];
    $('calc-mode').innerHTML = modes.map(function (m) {
      return '<button type="button" data-cmode="' + m[0] + '" aria-pressed="' + (calc.mode === m[0]) + '"' +
        (m[0] === 'chi' && three ? ' disabled' : '') + '>' + m[1] + '</button>';
    }).join('');
    var rows = [[0, 9], [9, 18], [18, 27], [27, 34]];
    $('calc-palette').innerHTML = rows.map(function (r) {
      var out = '';
      for (var t = r[0]; t < r[1]; t++) {
        if (!usable(t)) { out += '<span class="tile-btn blank"></span>'; continue; }
        out += '<button type="button" class="tile-btn" data-cadd="' + t + '"' + (canAdd(calc.mode, t, counts, usable) ? '' : ' disabled') +
          ' aria-label="' + E.tileName(t) + '">' + T.tileSVG(t) + '</button>';
      }
      return '<div class="pal-row">' + out + '</div>';
    }).join('');

    // 条件
    function seg(key, opts) {
      return '<div class="seg">' + opts.map(function (o) {
        return '<button type="button" data-cset="' + key + '" data-val="' + o[0] + '" aria-pressed="' + (String(calc[key]) === String(o[0])) + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    function flag(key, label) {
      return '<button type="button" class="toggle" data-cflag="' + key + '" aria-pressed="' + !!calc.flags[key] + '">' + label + '</button>';
    }
    var seats = [[27, '東・親'], [28, '南'], [29, '西']].concat(three ? [] : [[30, '北']]);
    $('calc-opts').innerHTML =
      '<div class="opt-row">' + seg('tsumo', [[false, 'ロン'], [true, 'ツモ']]) + seg('riichi', [[0, 'リーチなし'], [1, 'リーチ'], [2, 'ダブル']]) + '</div>' +
      '<div class="opt-row"><label>場風</label>' + seg('round', [[27, '東'], [28, '南']]) + '<label>自風</label>' + seg('seat', seats) + '</div>' +
      '<div class="opt-row"><label>ドラ</label><div class="stepper"><button type="button" data-cdora="-1" aria-label="ドラを減らす">−</button><b>' + calc.dora +
      '</b><button type="button" data-cdora="1" aria-label="ドラを増やす">＋</button></div><small>赤・裏も合わせた枚数</small></div>' +
      (three && rules.nukidora ? '<div class="opt-row"><label>北抜き</label><div class="stepper"><button type="button" data-cnuki="-1" aria-label="北抜きを減らす">−</button><b>' + calc.nuki +
        '</b><button type="button" data-cnuki="1" aria-label="北抜きを増やす">＋</button></div></div>' : '') +
      '<div class="opt-row">' + flag('ippatsu', '一発') + flag('rinshan', '嶺上開花') + flag('chankan', '槍槓') + flag('haitei', '海底・河底') + flag('tenhou', '天和・地和') + '</div>';

    // 結果
    var out;
    if (n < need) out = '<p class="hint">あと' + (need - n) + '枚入れると点数が出ます</p>';
    else {
      var closedCounts = new Array(34).fill(0);
      calc.tiles.forEach(function (t) { closedCounts[t]++; });
      var hand = { closed: calc.tiles.slice(0, n - 1), winTile: calc.tiles[n - 1], melds: calc.melds, tsumo: calc.tsumo,
        riichi: calc.riichi > 0, doubleRiichi: calc.riichi === 2, seatWind: calc.seat, roundWind: calc.round,
        doraIndicators: [], extraDora: calc.dora, nuki: calc.nuki, flags: calc.flags };
      var r = E.evaluate(hand, rules);
      if (r) out = explain({ type: 'hand', score: r.score, result: r });
      else if (S.shanten(closedCounts) === -1) out = '<div class="status">役がありません</div><p class="hint">リーチや役牌など、役が1つ必要です</p>';
      else out = '<div class="status">和了形ではありません</div><p class="hint">4面子1雀頭になるように入れてください</p>';
    }
    $('calc-result').innerHTML = out;
  }

  function calcClick(d) {
    if (d.cadd) {
      var t = Number(d.cadd);
      if (calc.mode === 'hand') calc.tiles.push(t);
      else { calc.melds.push({ type: calc.mode, tiles: meldTiles(calc.mode, t) }); calc.mode = 'hand'; }
    } else if (d.cremove) calc.tiles.splice(Number(d.cremove), 1);
    else if (d.mremove) calc.melds.splice(Number(d.mremove), 1);
    else if (d.cmode) calc.mode = d.cmode;
    else if (d.cset) calc[d.cset] = d.val === 'true' ? true : d.val === 'false' ? false : Number(d.val);
    else if (d.cflag) calc.flags[d.cflag] = !calc.flags[d.cflag];
    else if (d.cdora) calc.dora = Math.max(0, Math.min(20, calc.dora + Number(d.cdora)));
    else if (d.cnuki) calc.nuki = Math.max(0, Math.min(4, calc.nuki + Number(d.cnuki)));
    else return false;
    renderCalc();
    return true;
  }

  // ---------- 待ち牌ツール ----------
  function shantenLabel(n) { return n < 0 ? '和了形' : n === 0 ? 'テンパイ' : n + 'シャンテン'; }
  function waitTiles(list) {
    return '<div class="waits">' + list.map(function (w) {
      return '<span class="wait">' + T.tileSVG(w.tile) + '<small>' + w.left + '枚</small></span>';
    }).join('') + '</div>';
  }

  function renderMachi() {
    var usable = R.usable(rules);
    machi.tiles = machi.tiles.filter(usable).sort(function (a, b) { return a - b; });
    var counts = new Array(34).fill(0);
    machi.tiles.forEach(function (t) { counts[t]++; });
    var n = machi.tiles.length, full = n >= 14;

    $('machi-hand').innerHTML = n
      ? machi.tiles.map(function (t, i) {
        return '<button type="button" class="tile-btn" data-remove="' + i + '" aria-label="' + E.tileName(t) + 'を外す">' + T.tileSVG(t) + '</button>';
      }).join('')
      : '<span class="empty">下の牌をタップして手牌を作る</span>';
    $('machi-count').textContent = n + ' / 14枚';

    var rows = [[0, 9], [9, 18], [18, 27], [27, 34]];
    $('palette').innerHTML = rows.map(function (r) {
      var html = '';
      for (var t = r[0]; t < r[1]; t++) {
        if (!usable(t)) { html += '<span class="tile-btn blank"></span>'; continue; }
        html += '<button type="button" class="tile-btn" data-add="' + t + '"' + (full || counts[t] >= 4 ? ' disabled' : '') +
          ' aria-label="' + E.tileName(t) + 'を入れる">' + T.tileSVG(t) + '</button>';
      }
      return '<div class="pal-row">' + html + '</div>';
    }).join('');

    var out = '';
    if (n === 0) out = '';
    else if (n % 3 === 0) out = '<p class="hint">あと1枚か2枚入れると結果が出ます</p>';
    else if (n % 3 === 1) {
      var u = S.ukeire(counts, usable);
      out = '<div class="status s' + Math.min(u.shanten, 1) + '">' + shantenLabel(u.shanten) + '</div>' +
        '<h3>' + (u.shanten === 0 ? '待ち' : '有効牌') + '<em>' + u.tiles.length + '種 ' + u.total + '枚</em></h3>' + waitTiles(u.tiles);
    } else {
      var sh = S.shanten(counts);
      if (sh < 0) out = '<div class="status s0">和了形</div>';
      else {
        var list = S.discards(counts, usable), best = list[0];
        out = '<h3>何を切る？</h3><div class="discards">' + list.slice(0, 6).map(function (d) {
          var top = d.shanten === best.shanten && d.total === best.total;
          return '<div class="discard' + (top ? ' top' : '') + '"><span class="cut">' + T.tileSVG(d.discard) + '<small>切り</small></span>' +
            '<div><p><b>' + shantenLabel(d.shanten) + '</b>' + d.tiles.length + '種 ' + d.total + '枚</p>' + waitTiles(d.tiles) + '</div></div>';
        }).join('') + '</div>';
      }
    }
    $('machi-result').innerHTML = out;
    $('machi-result').hidden = !out;
  }

  // ---------- 役一覧 ----------
  function renderYaku() {
    var Y = window.MJYaku;
    function title(han) { return han === 13 ? '役満' : han === 26 ? 'ダブル役満' : han === 0 ? 'その他' : han + '翻'; }
    function short(han) { return han === 26 ? 'W役満' : han === 0 ? '他' : title(han); }
    $('yaku-jump').innerHTML = Y.YAKU.map(function (g) {
      return '<button type="button" data-jump="yaku-' + g.han + '">' + short(g.han) + '</button>';
    }).join('');
    $('yaku-body').innerHTML = Y.YAKU.map(function (g) {
      var off = g.han === 26 && !rules.doubleYakuman ? '<p class="note">設定で「ダブル役満なし」になっているので、役満として数えます。</p>' : '';
      return '<h2 id="yaku-' + g.han + '">' + title(g.han) + '</h2>' + off + '<div class="card yaku-list">' + g.list.map(function (y) {
        var open = y.kuitan && !rules.kuitan ? 0 : y.open, badge, dead = y.no3 && MODE === 3;
        if (y.badge) badge = '<span class="han sub">' + y.badge + '</span>';
        else if (g.han === 26) badge = '<span class="han ym">' + (rules.doubleYakuman ? 'ダブル役満' : '役満') + '</span>';
        else if (g.han === 13) badge = '<span class="han ym">役満</span>';
        else {
          badge = '<span class="han">' + y.closed + '翻</span>' +
            (open ? (open !== y.closed ? '<span class="han sub">鳴き' + open + '翻</span>' : '') : '<span class="han no">鳴き不可</span>');
        }
        var ex = y.ex ? '<div class="yaku-ex">' + y.ex.split(' ').map(function (part) {
          return '<span>' + tiles(Y.parse(part)) + '</span>';
        }).join('') + '</div>' : '';
        if (dead) badge = '<span class="han no">三麻では作れない</span>';
        return '<div class="yaku' + (dead ? ' dead' : '') + '"><div class="yaku-head"><div><strong>' + y.name + '</strong><small>' + y.kana + '</small></div><div class="hans">' + badge + '</div></div>' +
          '<p>' + y.desc + '</p>' + ex + '</div>';
      }).join('') + '</div>';
    }).join('');
  }

  // ---------- 早見表 ----------
  function renderTable() {
    var FUS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
    function cell(han, fu, dealer) {
      var ronOk = fu !== 20 && !(fu === 25 && han < 2);
      var tsumoOk = !(fu === 20 && han < 2) && !(fu === 25 && han < 3);
      if (!ronOk && !tsumoOk) return '<td class="na">-</td>';
      var ron = E.calcScore(han, fu, dealer, false, 0, rules), tsumo = E.calcScore(han, fu, dealer, true, 0, rules);
      return '<td' + (ron.limit ? ' class="mangan"' : '') + '>' + (ronOk ? ron.text : '-') + '<small>' + (tsumoOk ? tsumo.text : '-') + '</small></td>';
    }
    function build(dealer) {
      var html = '<table class="score"><thead><tr><th>符</th><th>1翻</th><th>2翻</th><th>3翻</th><th>4翻</th></tr></thead><tbody>';
      FUS.forEach(function (fu) {
        html += '<tr><th>' + fu + '</th>';
        for (var han = 1; han <= 4; han++) html += cell(han, fu, dealer);
        html += '</tr>';
      });
      return html + '</tbody></table>';
    }
    var limits = [['満貫', '5', 5], ['跳満', '6-7', 6], ['倍満', '8-10', 8], ['三倍満', '11-12', 11], ['役満', '13-', 13]];
    function limitTable(dealer) {
      return '<table class="score"><thead><tr><th></th><th>翻</th><th>ロン</th><th>ツモ</th></tr></thead><tbody>' +
        limits.map(function (r) {
          return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td><td>' + E.calcScore(r[2], 30, dealer, false, 0, rules).text +
            '</td><td>' + E.calcScore(r[2], 30, dealer, true, 0, rules).text + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    var dealer = $('table-dealer').getAttribute('aria-pressed') === 'true';
    $('table-rule').textContent = R.summary(rules);
    $('table-body').innerHTML = '<div class="table-wrap">' + build(dealer) + '</div><div class="table-wrap">' + limitTable(dealer) + '</div>';
  }

  // ---------- 設定 ----------
  function renderRules() {
    $('rule-items').innerHTML = R.ITEMS.filter(function (it) {
      return (!it.only3 || rules.players === 3) && (!it.when || rules[it.when]);
    }).map(function (it) {
      return '<div class="rule"><div><strong>' + it.label + '</strong><small>' + it.help + '</small></div><div class="seg">' +
        it.options.map(function (o) {
          return '<button type="button" data-rule="' + it.key + '" data-val="' + o[0] + '" aria-pressed="' +
            (rules[it.key] === o[0] ? 'true' : 'false') + '">' + o[1] + '</button>';
        }).join('') + '</div></div>';
    }).join('');
  }
  function setRule(key, raw) {
    rules[key] = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw);
    R.save(rules);
    renderRules();
  }

  // ---------- 操作 ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var d = t.dataset;
    if (calcClick(d)) return;
    if (t.id === 'calc-clear') { calc.tiles = []; calc.melds = []; calc.mode = 'hand'; renderCalc(); return; }
    if (d.start) start(d.start);
    else if (d.value) answer(d.value);
    else if (t.id === 'next') next();
    else if ('home' in d) renderHome();
    else if (d.add) { machi.tiles.push(Number(d.add)); renderMachi(); }
    else if (d.remove) { machi.tiles.splice(Number(d.remove), 1); renderMachi(); }
    else if (t.id === 'machi-clear') { machi.tiles = []; renderMachi(); }
    else if (d.jump) {
      var target = $(d.jump);
      window.scrollTo(0, target.getBoundingClientRect().top + window.pageYOffset - document.querySelector('.site-header').offsetHeight - 8);
    }
    else if (t.id === 'rule-reset') { rules = R.defaults(MODE); R.save(rules); renderRules(); }
    else if (d.rule) setRule(d.rule, d.val);
    else if (d.side) {
      $('table-child').setAttribute('aria-pressed', d.side === 'child' ? 'true' : 'false');
      $('table-dealer').setAttribute('aria-pressed', d.side === 'dealer' ? 'true' : 'false');
      renderTable();
    }
  });

  show(document.body.dataset.view);
})();
