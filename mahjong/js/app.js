// 画面の動き
(function () {
  'use strict';
  var E = window.MJEngine, G = window.MJGenerator, T = window.MJTiles;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = 'mj-drill-stats-v1';
  var state = { mode: null, question: null, answered: false, session: { total: 0, correct: 0, streak: 0 } };

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStats(stats) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* 保存できなくても続行 */ }
  }
  function record(mode, ok) {
    var stats = loadStats();
    var s = stats[mode] || { total: 0, correct: 0, best: 0 };
    s.total++;
    if (ok) s.correct++;
    s.best = Math.max(s.best, state.session.streak);
    stats[mode] = s;
    saveStats(stats);
  }

  function seatLabel(hand) {
    var w = E.WIND_NAMES[hand.seatWind - 27];
    return w + '家（' + (hand.seatWind === 27 ? '親' : '子') + '）';
  }

  function renderHome() {
    var stats = loadStats();
    ['table', 'hand'].forEach(function (m) {
      var s = stats[m], el = $('stat-' + m);
      el.textContent = s && s.total
        ? '正解率 ' + Math.round(s.correct / s.total * 100) + '%（' + s.total + '問）・最高連続 ' + s.best + '問'
        : 'まだ挑戦していません';
    });
    $('home').hidden = false;
    $('quiz').hidden = true;
  }

  function start(mode) {
    state.mode = mode;
    state.session = { total: 0, correct: 0, streak: 0 };
    $('home').hidden = true;
    $('quiz').hidden = false;
    $('quiz-title').textContent = mode === 'table' ? '翻と符から点数' : '手牌から点数';
    next();
    window.scrollTo(0, 0);
  }

  function next() {
    state.question = state.mode === 'table' ? G.makeTableQuestion() : G.makeHandQuestion();
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
      var h = q.hand;
      html += '<div class="chips">' + chip(E.WIND_NAMES[h.roundWind - 27] + '場') +
        chip(seatLabel(h), h.seatWind === 27 ? 'dealer' : '') +
        (h.riichi ? chip('リーチ', 'riichi') : '') + chip(h.tsumo ? 'ツモ' : 'ロン') + '</div>';
      html += '<div class="dora"><span>ドラ表示牌</span>' + h.doraIndicators.map(function (t) { return T.tileSVG(t); }).join('') + '</div>';
      html += '<div class="hand">' + h.closed.map(function (t) { return T.tileSVG(t); }).join('') +
        '<span class="win"><em>' + (h.tsumo ? 'ツモ' : 'ロン') + '</em>' + T.tileSVG(h.winTile) + '</span></div>';
      if (h.melds.length) {
        var names = { chi: 'チー', pon: 'ポン', minkan: '明槓', ankan: '暗槓' };
        html += '<div class="melds">' + h.melds.map(function (m) {
          var tiles = m.tiles.map(function (t, i) {
            return T.tileSVG(t, { back: m.type === 'ankan' && (i === 0 || i === 3) });
          }).join('');
          return '<span class="meld"><em>' + names[m.type] + '</em><span>' + tiles + '</span></span>';
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
    $('progress').textContent = s.total
      ? s.correct + ' / ' + s.total + ' 問正解・連続 ' + s.streak + ' 問'
      : '4つの中から正しい点数を選んでください';
  }

  function payText(score) {
    if (!score.isTsumo) return (score.isDealer ? '親' : '子') + 'のロン：' + score.total + '点';
    if (score.isDealer) return '親のツモ：' + score.each + '点ずつ（合計' + score.total + '点）';
    return '子のツモ：子から' + score.fromChild + '点、親から' + score.fromDealer + '点（合計' + score.total + '点）';
  }

  function formula(score) {
    if (score.limit) return score.limit + 'なので符は関係なく、基本点は' + score.base + '点です。';
    return '基本点は 符 × 2の(翻+2)乗 = ' + score.fu + ' × ' + Math.pow(2, score.han + 2) + ' = ' + score.base + '点。' +
      'これに' + (score.isTsumo ? (score.isDealer ? '2を掛けた額を全員' : '1（子）と2（親）を掛けた額をそれぞれ') : (score.isDealer ? '6' : '4') + 'を掛けた額を') +
      '100点単位に切り上げて受け取ります。';
  }

  function explain(q) {
    var s = q.score, html = '';
    if (q.type === 'hand') {
      var r = q.result;
      html += '<h3>役</h3><ul class="lines">' + r.yaku.map(function (y) {
        return '<li><span>' + y.name + '</span><b>' + (r.yakuman ? '役満' : y.han + '翻') + '</b></li>';
      }).join('');
      if (r.dora) html += '<li><span>ドラ（' + E.tileName(E.doraFromIndicator(q.hand.doraIndicators[0])) + '）</span><b>' + r.dora + '翻</b></li>';
      if (!r.yakuman) html += '<li class="sum"><span>合計</span><b>' + r.han + '翻</b></li>';
      html += '</ul>';
      if (!s.limit) {
        var raw = r.fuItems.reduce(function (a, x) { return a + x.fu; }, 0);
        html += '<h3>符</h3><ul class="lines">' + r.fuItems.map(function (f) {
          return '<li><span>' + f.label + '</span><b>' + f.fu + '符</b></li>';
        }).join('') + '<li class="sum"><span>合計' + (raw !== r.fu ? '（' + raw + '符を切り上げ）' : '') + '</span><b>' + r.fu + '符</b></li></ul>';
      }
    }
    html += '<h3>点数</h3><p>' + (s.limit ? '' : s.fu + '符' + s.han + '翻。') + formula(s) + '</p>' +
      '<p class="pay">' + payText(s) + '</p>';
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
    $('result').innerHTML = '<p class="verdict ' + (ok ? 'ok' : 'ng') + '">' +
      (ok ? '正解' : '不正解') + '：答えは ' + q.answer + '</p>' + explain(q) +
      '<button type="button" id="next" class="primary">次の問題へ</button>';
    $('result').hidden = false;
    $('next').addEventListener('click', next);
    $('next').focus({ preventScroll: true });
    renderProgress();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-start],[data-value],[data-home]');
    if (!t) return;
    if (t.dataset.start) start(t.dataset.start);
    else if (t.dataset.value) answer(t.dataset.value);
    else if ('home' in t.dataset) renderHome();
  });

  renderHome();
})();
