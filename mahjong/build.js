// src/ の部品から各ページのHTMLを作る。使い方: node build.js
// ページの中身を変えるときは src/ を編集してから実行する（出力されたHTMLは直接編集しない）
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://yasugi-ryuhei.github.io/mahjong/'; // 独自ドメインにしたらここを変える
const NAME = '麻雀ドリル';

// 四麻は直下、三麻は sanma/ の下に同じ構成で作る
const MODES = [
  { players: 4, base: '', label: '四麻' },
  { players: 3, base: 'sanma/', label: '三麻' }
];

// 並び順がそのままタブの順番になる。4 が四麻、3 が三麻のページの文言
const PAGES = [
  { view: 'yaku', dir: '', tab: '役一覧',
    4: { h1: '麻雀の役一覧', title: '麻雀の役一覧｜翻数・鳴きの可否・例つき',
      desc: '麻雀の役を1翻から役満・ダブル役満まで一覧で確認できます。翻数、鳴いたときの翻数、例の牌つき。',
      about: '麻雀の役を翻数ごとにまとめた一覧です。鳴くと翻数が下がる役、鳴くと成立しない役もひと目でわかります。' },
    3: { h1: '三人麻雀の役一覧', title: '三人麻雀（サンマ）の役一覧｜翻数・鳴きの可否・三麻で作れない役',
      desc: '三人麻雀（サンマ）の役を1翻から役満まで一覧で確認できます。三麻では作れない役、北抜きドラの扱いもわかります。',
      about: '三人麻雀は二萬〜八萬を使わず、チーもできません。そのため三色同順は作れません。' } },
  { view: 'table', dir: 'score-table', tab: '点数表',
    4: { h1: '麻雀の点数表', title: '麻雀の点数表（早見表）｜子・親のロンとツモ',
      desc: '麻雀の点数早見表です。20符から110符・1翻から4翻のロンとツモ、満貫以上の点数を子と親で切り替えて確認できます。',
      about: '符と翻から点数を引ける早見表です。20符はツモの平和だけ、25符は七対子だけで現れます。' },
    3: { h1: '三人麻雀の点数表', title: '三人麻雀（サンマ）の点数表｜ツモ損あり・なし、1000点単位に対応',
      desc: '三人麻雀（サンマ）の点数早見表です。ツモ損あり・なし、1000点単位の切り上げなど、自分の卓のルールに合わせた点数表を表示できます。',
      about: '三人麻雀はツモの支払いと点数の丸め方が卓ごとに違います。設定を変えると、この表もそのルールの点数に変わります。' } },
  { view: 'calc', dir: 'calculator', tab: '計算機',
    4: { h1: '麻雀の点数計算機', title: '麻雀の点数計算機｜手牌を入れて役・符・点数を自動計算',
      desc: '手牌と鳴き、リーチやドラを入れるだけで、役・符・点数を自動で計算します。赤ドラや切り上げ満貫などのルール設定にも対応。',
      about: '和了した手牌を入れると、役と符の内訳、点数をその場で表示する計算機です。' },
    3: { h1: '三人麻雀の点数計算機', title: '三人麻雀（サンマ）の点数計算機｜北抜き・ツモ損・1000点単位に対応',
      desc: '三人麻雀（サンマ）専用の点数計算機です。北抜きドラ、ツモ損あり・なし、1000点単位の丸め方を選んで、役・符・点数を自動で計算します。',
      about: '北抜きドラの枚数、ツモ損の有無、点数の丸め方を自分の卓のルールに合わせて計算できます。' } },
  { view: 'machi', dir: 'machi', tab: '待ち牌',
    4: { h1: '麻雀の待ち牌チェック', title: '麻雀の待ち牌チェック・何切るツール｜受け入れ枚数を自動計算',
      desc: '手牌を入れると、待ち牌と残り枚数、何を切ると受け入れが何種何枚になるかを自動で計算します。シャンテン数も表示。',
      about: '手牌の待ち牌、シャンテン数、切る牌ごとの受け入れ枚数を調べられるツールです。' },
    3: { h1: '三人麻雀の待ち牌チェック', title: '三人麻雀（サンマ）の待ち牌チェック・何切るツール',
      desc: '三人麻雀（サンマ）の手牌を入れると、待ち牌と残り枚数、何を切ると受け入れが何種何枚になるかを自動で計算します。',
      about: '二萬〜八萬を除いた三人麻雀の牌で、待ち牌と受け入れ枚数を計算します。' } },
  { view: 'practice', dir: 'practice', tab: '練習',
    4: { h1: '麻雀の点数計算の練習', title: '麻雀の点数計算 練習問題（無料・解説つき）',
      desc: '麻雀の点数計算を4択で練習できます。翻と符から答える問題と、手牌から役・符を数える問題。役と符の内訳つきで何問でも無料。',
      about: '問題は毎回自動で作られます。成績はこの端末に保存され、登録は不要です。' },
    3: { h1: '三人麻雀の点数計算の練習', title: '三人麻雀（サンマ）の点数計算 練習問題（無料・解説つき）',
      desc: '三人麻雀（サンマ）の点数計算を4択で練習できます。北抜きドラやツモ損など、自分の卓のルールで出題します。',
      about: '設定したルールで問題が作られます。成績はこの端末に保存され、登録は不要です。' } },
  { view: 'rules', dir: 'settings', tab: '設定', noindex: true,
    4: { h1: 'ルール設定', title: 'ルール設定',
      desc: '赤ドラの枚数、切り上げ満貫など、自分のルールに合わせて設定できます。',
      note: 'わからなければ、このままで大丈夫です。もっとも一般的なルールになっています。',
      about: '設定は点数表、計算機、待ち牌、練習のすべてに反映され、この端末に保存されます。' },
    3: { h1: '三人麻雀のルール設定', title: '三人麻雀のルール設定',
      desc: '北抜きドラ、ツモ損、1000点単位など、自分の卓のルールに合わせて設定できます。',
      note: '最初はネット麻雀でよくあるルール（ツモ損あり・北抜きドラあり・100点単位）になっています。自分の卓に合わせて変えてください。',
      about: '設定は点数表、計算機、待ち牌、練習のすべてに反映され、この端末に保存されます。' } }
];

const here = (...p) => path.join(__dirname, ...p);
const template = fs.readFileSync(here('src', 'template.html'), 'utf8');
const urls = [];

for (const mode of MODES) {
  for (const page of PAGES) {
    const text = page[mode.players];
    const rel = mode.base + (page.dir ? page.dir + '/' : '');     // サイト内でのこのページの場所
    const root = '../'.repeat(rel.split('/').length - 1) || './'; // サイトの一番上への戻り方
    const tabs = PAGES.map((p) => {
      const current = p === page ? ' aria-current="page"' : '';
      return `        <a href="${root}${mode.base}${p.dir ? p.dir + '/' : ''}"${current}>${p.tab}</a>`;
    }).join('\n');
    const modes = MODES.map((m) => {
      const current = m === mode ? ' aria-current="true"' : '';
      return `          <a href="${root}${m.base}${page.dir ? page.dir + '/' : ''}"${current}>${m.label}</a>`;
    }).join('\n');
    let html = template
      .replace('{{CONTENT}}', fs.readFileSync(here('src', 'views', page.view + '.html'), 'utf8'))
      .replace('{{TABS}}', tabs)
      .replace('{{MODES}}', modes)
      .replace(/{{TITLE}}/g, `${text.title}｜${NAME}`)
      .replace(/{{DESC}}/g, text.desc)
      .replace(/{{URL}}/g, SITE + rel)
      .replace(/{{VIEW}}/g, page.view)
      .replace(/{{PLAYERS}}/g, String(mode.players))
      .replace(/{{H1}}/g, text.h1)
      .replace('{{RULES_NOTE}}', text.note || '')
      .replace('{{ABOUT}}', text.about)
      .replace(/{{BASE}}/g, root + mode.base)
      .replace(/{{ROOT}}/g, root);
    if (page.noindex) html = html.replace('  <link rel="canonical"', '  <meta name="robots" content="noindex">\n  <link rel="canonical"');
    else urls.push(SITE + rel);
    fs.mkdirSync(here(rel), { recursive: true });
    fs.writeFileSync(here(rel, 'index.html'), html);
  }
}

// 以前のURLからの転送
fs.writeFileSync(here('score-table.html'),
  `<!DOCTYPE html>\n<html lang="ja"><head><meta charset="utf-8"><title>麻雀の点数表</title>\n` +
  `<link rel="canonical" href="${SITE}score-table/"><meta http-equiv="refresh" content="0; url=score-table/"></head>\n` +
  `<body><a href="score-table/">麻雀の点数表はこちら</a></body></html>\n`);

fs.writeFileSync(here('sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);

console.log('built', urls.length, 'indexed pages');
