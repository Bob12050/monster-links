# 画像差し替えガイド v2.7

## 基本ルール

v2.7では、PNGを置くだけで差し替えやすいようにしています。

例:

```text
assets/images/monsters/plim.png
```

を置くと、ゲームは `plim.png` を優先表示します。PNGがない場合は、同梱されている `plim.svg` を表示します。SVGも読み込めない場合は、絵文字表示に戻ります。

## フォルダ

```text
assets/images/
├─ monsters/  # モンスター画像
├─ stages/    # ステージ背景画像
├─ items/     # 装備・アクセサリー画像
├─ ui/        # ロゴやUI素材
└─ effects/   # 攻撃演出素材
```

## ファイル名ルール

- モンスター画像: モンスターIDと一致
- ステージ背景: ステージIDと一致
- 装備画像: アイテムIDと一致

例:

```text
plim.png
meadow.png
force_ring.png
```

## 推奨サイズ

```text
モンスター: 512x512 または 1024x1024 / 透過PNG
装備: 512x512 / 透過PNG
ステージ背景: 1280x720 / PNGまたはJPG
```
