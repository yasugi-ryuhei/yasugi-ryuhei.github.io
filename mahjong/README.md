# 麻雀ドリル

麻雀の役一覧、点数表、点数計算機、待ち牌チェック、点数計算の練習をまとめた静的サイトです。

公開URL: https://yasugi-ryuhei.github.io/mahjong/

## ページ
| URL | 内容 |
|---|---|
| `/mahjong/` | 役一覧 |
| `/mahjong/score-table/` | 点数表 |
| `/mahjong/calculator/` | 点数計算機 |
| `/mahjong/machi/` | 待ち牌チェック |
| `/mahjong/practice/` | 点数計算の練習 |
| `/mahjong/settings/` | ルール設定 |

## 編集のしかた
各ページのHTMLは `build.js` が `src/` から作ります。出力された `index.html` などは直接編集しません。

- `src/template.html` 全ページ共通の枠
- `src/views/*.html` 各ページの中身
- `build.js` ページのタイトル、説明文、タブの順番、サイトのURL

```bash
node build.js
```

## プログラム
- `js/engine.js` 役判定・符計算・点数計算
- `js/generator.js` 練習問題の自動生成
- `js/shanten.js` シャンテン数・待ち牌・受け入れの計算
- `js/rules.js` ルール設定（赤ドラ、三人麻雀、北抜きドラなど）
- `js/yaku.js` 役一覧のデータ
- `js/tiles.js` 牌の描画（SVG）
- `js/app.js` 画面の動き

```bash
node --test tests/engine.test.js
```
