# v8.6-A.29 アート管理正式化・公開ZIP軽量化

## 目的

全モンスターの画像ファイルが揃っている状態に合わせ、管理表と監査ツール上の「仮アート」扱いを解消する。

## 実施内容

- 全84体のモンスターを `formal_png` として扱うよう `tools/art-audit.mjs` を更新
- `cloudplim` / `skywarden` の参照を `.svg` から `.png` へ統一
- `node tools/art-audit.mjs --write` で `docs/ART_ASSET_MANIFEST.md`、`docs/ART_ASSET_MANIFEST.csv`、`assets/images/art_manifest.json` を再生成
- 公開用ZIPでは `docs`、`tools`、`data`、`.claude`、`.github`、`.incoming-awamarine`、`assets/images/monsters/legacy` を除外

## 監査結果

```text
monster_total=84
formal_png=84
placeholder_png=0
placeholder_svg=0
missing=0
```

## 変更しないもの

```text
モンスターID
rank
能力値
成長値
配合レシピ
ステージ構成
報酬
セーブ形式
ゲームバランス
```
