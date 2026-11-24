# 麻雀ドリル

麻雀の点数計算を練習するWebサイトです。ビルド不要の静的サイトで、`index.html` を開けば動きます。

- `index.html` 練習・待ち牌チェック・早見表・ルール設定（タブ切り替え）
- `score-table.html` 点数早見表（検索向けの単独ページ）
- `js/shanten.js` シャンテン数・待ち牌・受け入れの計算
- `js/rules.js` ルール設定（赤ドラ、三人麻雀など）
- `js/engine.js` 役判定・符計算・点数計算
- `js/generator.js` 問題の自動生成
- `js/tiles.js` 牌の描画（SVG）
- `js/app.js` 画面の動き

テスト:

```bash
node --test tests/engine.test.js
```
