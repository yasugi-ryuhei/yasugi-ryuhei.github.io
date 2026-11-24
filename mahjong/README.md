# 麻雀ドリル

麻雀の点数計算を練習するWebサイトです。ビルド不要の静的サイトで、`index.html` を開けば動きます。

- `index.html` 練習問題（翻と符から点数／手牌から点数）
- `score-table.html` 点数早見表
- `js/engine.js` 役判定・符計算・点数計算
- `js/generator.js` 問題の自動生成
- `js/tiles.js` 牌の描画（SVG）
- `js/app.js` 画面の動き

テスト:

```bash
node --test tests/engine.test.js
```
