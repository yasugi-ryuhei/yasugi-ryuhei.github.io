// src/ の部品から各ページのHTMLを作る。使い方: node build.js
// ページの中身を変えるときは src/ を編集してから実行する（出力されたHTMLは直接編集しない）
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://yasugi-ryuhei.github.io/mahjong/'; // 独自ドメインにしたらここを変える
const NAME = '麻雀ドリル';

// 並び順がそのままタブの順番になる
const PAGES = [
  { view: 'yaku', dir: '', tab: '役一覧',
    title: '麻雀の役一覧｜翻数・鳴きの可否・例つき',
    desc: '麻雀の役を1翻から役満・ダブル役満まで一覧で確認できます。翻数、鳴いたときの翻数、例の牌つき。',
    about: '麻雀の役を翻数ごとにまとめた一覧です。鳴くと翻数が下がる役、鳴くと成立しない役もひと目でわかります。' },
  { view: 'table', dir: 'score-table', tab: '点数表',
    title: '麻雀の点数表（早見表）｜子・親のロンとツモ',
    desc: '麻雀の点数早見表です。20符から110符・1翻から4翻のロンとツモ、満貫以上の点数を子と親で切り替えて確認できます。',
    about: '符と翻から点数を引ける早見表です。20符はツモの平和だけ、25符は七対子だけで現れます。' },
  { view: 'calc', dir: 'calculator', tab: '計算機',
    title: '麻雀の点数計算機｜手牌を入れて役・符・点数を自動計算',
    desc: '手牌と鳴き、リーチやドラを入れるだけで、役・符・点数を自動で計算します。三人麻雀や赤ドラなどのルール設定にも対応。',
    about: '和了した手牌を入れると、役と符の内訳、点数をその場で表示する計算機です。' },
  { view: 'machi', dir: 'machi', tab: '待ち牌',
    title: '麻雀の待ち牌チェック・何切るツール｜受け入れ枚数を自動計算',
    desc: '手牌を入れると、待ち牌と残り枚数、何を切ると受け入れが何種何枚になるかを自動で計算します。シャンテン数も表示。',
    about: '手牌の待ち牌、シャンテン数、切る牌ごとの受け入れ枚数を調べられるツールです。' },
  { view: 'practice', dir: 'practice', tab: '練習',
    title: '麻雀の点数計算 練習問題（無料・解説つき）',
    desc: '麻雀の点数計算を4択で練習できます。翻と符から答える問題と、手牌から役・符を数える問題。役と符の内訳つきで何問でも無料。',
    about: '問題は毎回自動で作られます。成績はこの端末に保存され、登録は不要です。' },
  { view: 'rules', dir: 'settings', tab: '設定', noindex: true,
    title: 'ルール設定',
    desc: '赤ドラの枚数、三人麻雀、切り上げ満貫など、自分のルールに合わせて設定できます。',
    about: '設定は点数表、計算機、待ち牌、練習のすべてに反映され、この端末に保存されます。' }
];

const here = (...p) => path.join(__dirname, ...p);
const template = fs.readFileSync(here('src', 'template.html'), 'utf8');

for (const page of PAGES) {
  const root = page.dir ? '../' : './';
  const tabs = PAGES.map((p) => {
    const href = root + (p.dir ? p.dir + '/' : '');
    const current = p === page ? ' aria-current="page"' : '';
    return `        <a href="${href}"${current}>${p.tab}</a>`;
  }).join('\n');
  let html = template
    .replace('{{CONTENT}}', fs.readFileSync(here('src', 'views', page.view + '.html'), 'utf8'))
    .replace('{{TABS}}', tabs)
    .replace(/{{TITLE}}/g, `${page.title}｜${NAME}`)
    .replace(/{{DESC}}/g, page.desc)
    .replace(/{{URL}}/g, SITE + (page.dir ? page.dir + '/' : ''))
    .replace(/{{VIEW}}/g, page.view)
    .replace('{{ABOUT}}', page.about)
    .replace(/{{ROOT}}/g, root);
  if (page.noindex) html = html.replace('  <link rel="canonical"', '  <meta name="robots" content="noindex">\n  <link rel="canonical"');
  const dir = here(page.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// 以前のURLからの転送
fs.writeFileSync(here('score-table.html'),
  `<!DOCTYPE html>\n<html lang="ja"><head><meta charset="utf-8"><title>麻雀の点数表</title>\n` +
  `<link rel="canonical" href="${SITE}score-table/"><meta http-equiv="refresh" content="0; url=score-table/"></head>\n` +
  `<body><a href="score-table/">麻雀の点数表はこちら</a></body></html>\n`);

const urls = PAGES.filter((p) => !p.noindex).map((p) => `  <url><loc>${SITE}${p.dir ? p.dir + '/' : ''}</loc></url>`).join('\n');
fs.writeFileSync(here('sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

console.log('built', PAGES.length, 'pages');
