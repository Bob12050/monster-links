# 画像差し替えルール

## 基本

PNGを置くと、ゲーム内ではPNGが優先されます。

```text
PNG
↓
SVG
↓
絵文字
```

## モンスター

```text
assets/images/monsters/{monster_id}.png
```

例:

```text
assets/images/monsters/plim.png
assets/images/monsters/demonlord.png
```

## ステージ

```text
assets/images/stages/{stage_id}.png
```

例:

```text
assets/images/stages/meadow.png
assets/images/stages/demon_gate.png
```

## アイテム

```text
assets/images/items/{item_id}.png
```

例:

```text
assets/images/items/force_ring.png
assets/images/items/chaos_crown.png
```

## 管理表

```text
docs/ART_ASSET_MANIFEST.md
docs/ART_ASSET_MANIFEST.csv
assets/images/art_manifest.json
```

管理表はゲーム本体のモンスターデータを基準に更新します。

```powershell
node tools/art-audit.mjs --write
```
