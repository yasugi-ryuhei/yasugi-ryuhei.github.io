// 役の一覧。closed=門前の翻数、open=鳴いたときの翻数（0は鳴くと成立しない）
// ex は例の牌（m=萬子 p=筒子 s=索子 z=字牌 1-4東南西北 5-7白發中、空白で面子を区切る）
(function (root) {
  'use strict';
  var YAKU = [
    { han: 1, list: [
      { name: '立直', kana: 'リーチ', closed: 1, open: 0, desc: '門前でテンパイして宣言する' },
      { name: '門前清自摸和', kana: 'ツモ', closed: 1, open: 0, desc: '門前でツモ和了' },
      { name: '断么九', kana: 'タンヤオ', closed: 1, open: 1, kuitan: true, desc: '2〜8の牌だけ', ex: '234m 567p 678s 55s' },
      { name: '平和', kana: 'ピンフ', closed: 1, open: 0, desc: '順子4つ・役牌でない雀頭・両面待ち', ex: '123m 456p 789s 99m 23s' },
      { name: '一盃口', kana: 'イーペーコー', closed: 1, open: 0, desc: '同じ順子が2つ', ex: '223344m' },
      { name: '役牌', kana: 'ヤクハイ', closed: 1, open: 1, desc: '白・發・中・場風・自風の刻子', ex: '555z 666z 777z' },
      { name: '一発', kana: 'イッパツ', closed: 1, open: 0, desc: 'リーチ後1巡以内に和了' },
      { name: '嶺上開花', kana: 'リンシャンカイホー', closed: 1, open: 1, desc: 'カンで引いた牌で和了' },
      { name: '槍槓', kana: 'チャンカン', closed: 1, open: 1, desc: '相手の加槓の牌でロン' },
      { name: '海底摸月・河底撈魚', kana: 'ハイテイ・ホウテイ', closed: 1, open: 1, desc: '最後の牌で和了' }
    ] },
    { han: 2, list: [
      { name: '七対子', kana: 'チートイツ', closed: 2, open: 0, desc: '対子が7つ（25符）', ex: '11m 44m 66p 99p 22s 77s 55z' },
      { name: '三色同順', kana: 'サンショク', closed: 2, open: 1, desc: '同じ数字の順子を3色で', ex: '234m 234p 234s' },
      { name: '一気通貫', kana: 'イッツー', closed: 2, open: 1, desc: '同じ色で1〜9', ex: '123m 456m 789m' },
      { name: '混全帯么九', kana: 'チャンタ', closed: 2, open: 1, desc: '全部の面子と雀頭に1・9・字牌', ex: '123m 789p 111z 99s' },
      { name: '対々和', kana: 'トイトイ', closed: 2, open: 2, desc: '刻子が4つ', ex: '222m 777p 444s 666z' },
      { name: '三暗刻', kana: 'サンアンコー', closed: 2, open: 2, desc: '鳴いていない刻子が3つ', ex: '333m 888p 222s' },
      { name: '三色同刻', kana: 'サンショクドーコー', closed: 2, open: 2, desc: '同じ数字の刻子を3色で', ex: '444m 444p 444s' },
      { name: '小三元', kana: 'ショウサンゲン', closed: 2, open: 2, desc: '三元牌の刻子2つと雀頭', ex: '555z 666z 77z' },
      { name: '混老頭', kana: 'ホンロートー', closed: 2, open: 2, desc: '1・9・字牌だけ', ex: '111m 999p 111z 99s' },
      { name: '三槓子', kana: 'サンカンツ', closed: 2, open: 2, desc: 'カンが3つ' },
      { name: 'ダブル立直', kana: 'ダブルリーチ', closed: 2, open: 0, desc: '最初の打牌でリーチ' }
    ] },
    { han: 3, list: [
      { name: '混一色', kana: 'ホンイツ', closed: 3, open: 2, desc: '1色と字牌だけ', ex: '123p 567p 999p 222z 55z' },
      { name: '純全帯么九', kana: 'ジュンチャン', closed: 3, open: 2, desc: '全部の面子と雀頭に1・9', ex: '123m 789m 789p 111s 99p' },
      { name: '二盃口', kana: 'リャンペーコー', closed: 3, open: 0, desc: '一盃口が2組', ex: '223344m 667788p' }
    ] },
    { han: 6, list: [
      { name: '清一色', kana: 'チンイツ', closed: 6, open: 5, desc: '1色だけ', ex: '123s 345s 678s 999s 22s' }
    ] },
    { han: 13, list: [
      { name: '国士無双', kana: 'コクシムソウ', desc: '1・9・字牌を1枚ずつと、どれか1枚', ex: '19m 19p 19s 1234567z' },
      { name: '四暗刻', kana: 'スーアンコー', desc: '鳴いていない刻子が4つ', ex: '222m 888m 555p 111s' },
      { name: '大三元', kana: 'ダイサンゲン', desc: '白・發・中すべて刻子', ex: '555z 666z 777z' },
      { name: '字一色', kana: 'ツーイーソー', desc: '字牌だけ', ex: '111z 333z 555z 666z 22z' },
      { name: '小四喜・大四喜', kana: 'ショウスーシー・ダイスーシー', desc: '風牌4種を刻子3つ以上と雀頭', ex: '111z 222z 333z 44z' },
      { name: '緑一色', kana: 'リューイーソー', desc: '緑の牌だけ（2・3・4・6・8索と發）', ex: '234s 666s 888s 666z' },
      { name: '清老頭', kana: 'チンロートー', desc: '1と9だけ', ex: '111m 999m 111p 999s' },
      { name: '九蓮宝燈', kana: 'チューレンポートー', desc: '1色で1112345678999＋1枚', ex: '1112345678999m' },
      { name: '四槓子', kana: 'スーカンツ', desc: 'カンが4つ' },
      { name: '天和・地和', kana: 'テンホー・チーホー', desc: '配牌または最初のツモで和了' }
    ] }
  ];

  function parse(str) {
    var out = [], nums = [];
    str.split('').forEach(function (ch) {
      if (/\d/.test(ch)) nums.push(Number(ch));
      else {
        var base = { m: 0, p: 9, s: 18, z: 27 }[ch];
        nums.forEach(function (n) { out.push(base + n - 1); });
        nums = [];
      }
    });
    return out;
  }

  var api = { YAKU: YAKU, parse: parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MJYaku = api;
})(typeof self !== 'undefined' ? self : this);
