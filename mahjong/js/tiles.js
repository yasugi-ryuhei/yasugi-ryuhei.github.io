// 牌の絵をSVGで描く（画像ファイルを使わない）
(function (root) {
  'use strict';
  var RED = '#c8102e', GREEN = '#0b7a3b', BLUE = '#1d4e9e', INK = '#1b1b1b';
  var KANJI = '一二三四五六七八九';
  var HONOR = '東南西北白發中';
  var FONT = "font-family=\"'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif\" font-weight=\"700\" text-anchor=\"middle\"";

  // 筒子の丸の位置 [x, y, 色]
  var X = [11, 20, 29], Y4 = [10, 22, 34, 46];
  var PIN = {
    1: [[20, 28, RED, 11]],
    2: [[20, 16, BLUE], [20, 40, GREEN]],
    3: [[11, 13, BLUE], [20, 28, RED], [29, 43, GREEN]],
    4: [[12, 16, BLUE], [28, 16, GREEN], [12, 40, GREEN], [28, 40, BLUE]],
    5: [[12, 14, BLUE], [28, 14, GREEN], [20, 28, RED], [12, 42, GREEN], [28, 42, BLUE]],
    6: [[12, 12, GREEN], [28, 12, GREEN], [12, 30, RED], [28, 30, RED], [12, 44, RED], [28, 44, RED]],
    7: [[10, 9, GREEN], [20, 15, GREEN], [30, 21, GREEN], [12, 34, RED], [28, 34, RED], [12, 46, RED], [28, 46, RED]],
    8: [0, 1, 2, 3].reduce(function (a, r) { return a.concat([[12, Y4[r], BLUE], [28, Y4[r], BLUE]]); }, []),
    9: [0, 1, 2].reduce(function (a, r) {
      var y = [12, 28, 44][r], c = [BLUE, RED, GREEN][r];
      return a.concat(X.map(function (x) { return [x, y, c]; }));
    }, [])
  };
  // 索子の棒の位置 [x, y, 色]
  var SOU = {
    2: [[20, 16, GREEN], [20, 40, GREEN]],
    3: [[20, 15, GREEN], [12, 41, GREEN], [28, 41, GREEN]],
    4: [[12, 15, GREEN], [28, 15, GREEN], [12, 41, GREEN], [28, 41, GREEN]],
    5: [[11, 15, GREEN], [29, 15, GREEN], [20, 28, RED], [11, 41, GREEN], [29, 41, GREEN]],
    6: X.reduce(function (a, x) { return a.concat([[x, 15, GREEN], [x, 41, GREEN]]); }, []),
    7: [[20, 11, RED]].concat(X.reduce(function (a, x) { return a.concat([[x, 28, GREEN], [x, 45, GREEN]]); }, [])),
    8: [8, 16, 24, 32].reduce(function (a, x) { return a.concat([[x, 15, GREEN], [x, 41, GREEN]]); }, []),
    9: X.reduce(function (a, x) { return a.concat([[x, 11, x === 20 ? RED : GREEN], [x, 28, x === 20 ? RED : GREEN], [x, 45, x === 20 ? RED : GREEN]]); }, [])
  };

  function face(t) {
    if (t < 9) {
      return '<text x="20" y="24" font-size="22" fill="' + INK + '" ' + FONT + '>' + KANJI[t] + '</text>' +
        '<text x="20" y="49" font-size="22" fill="' + RED + '" ' + FONT + '>萬</text>';
    }
    if (t < 18) {
      var n = t - 9 + 1;
      var r = { 1: 11, 2: 8, 3: 7, 4: 7, 5: 6.5, 6: 6, 7: 5, 8: 5, 9: 5 }[n];
      return PIN[n].map(function (d) {
        var rr = d[3] || r;
        return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + rr + '" fill="' + d[2] + '"/>' +
          '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + (rr * 0.38) + '" fill="#fff"/>';
      }).join('');
    }
    if (t < 27) {
      var m = t - 18 + 1;
      if (m === 1) {
        return '<rect x="15" y="8" width="10" height="40" rx="5" fill="' + GREEN + '"/>' +
          '<rect x="15" y="23" width="10" height="10" fill="' + RED + '"/>' +
          '<rect x="12" y="8" width="16" height="3" rx="1.5" fill="' + GREEN + '"/>' +
          '<rect x="12" y="45" width="16" height="3" rx="1.5" fill="' + GREEN + '"/>';
      }
      var h = m >= 7 ? 13 : 20, w = m === 8 ? 5 : 6;
      return SOU[m].map(function (d) {
        return '<rect x="' + (d[0] - w / 2) + '" y="' + (d[1] - h / 2) + '" width="' + w + '" height="' + h +
          '" rx="' + (w / 2) + '" fill="' + d[2] + '"/>';
      }).join('');
    }
    if (t === 31) return '<rect x="8" y="9" width="24" height="38" rx="3" fill="none" stroke="' + BLUE + '" stroke-width="2.5"/>';
    var color = t === 32 ? GREEN : t === 33 ? RED : INK;
    return '<text x="20" y="39" font-size="30" fill="' + color + '" ' + FONT + '>' + HONOR[t - 27] + '</text>';
  }

  function tileSVG(t, opts) {
    opts = opts || {};
    var label = opts.back ? '裏向きの牌' : root.MJEngine.tileName(t);
    var body = opts.back
      ? '<rect x="1" y="1" width="38" height="54" rx="5" fill="#e0a13a" stroke="#9c6b17" stroke-width="1.5"/>'
      : '<rect x="1" y="1" width="38" height="54" rx="5" fill="#fffdf6" stroke="#b9b29f" stroke-width="1.5"/>' + face(t);
    return '<svg class="tile' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="0 0 40 56" role="img" aria-label="' + label + '">' + body + '</svg>';
  }

  root.MJTiles = { tileSVG: tileSVG };
})(typeof self !== 'undefined' ? self : this);
