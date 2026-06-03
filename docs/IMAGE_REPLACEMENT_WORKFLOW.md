# PNG画像差し替え作業フロー

## 基本手順

```text
1. 画像を作成する
2. assets/images/monsters/{id}.png に保存する
3. 必要なら js/core/monsters.js の image を .png に変更する
4. ゲームを起動して確認する
5. docs/ART_ASSET_MANIFEST.* の status を更新する
```

## 既存仕様

ゲーム側は PNG を優先表示します。
ただし、単一HTML版に埋め込む関係で、本格実装済みのものは `js/core/monsters.js` の image を `.png` に変えておくと管理しやすいです。

## 今回の実装例

```text
plim      plim.svg -> plim.png
leafling  leafling.svg -> leafling.png
demonlord demonlord.svg -> demonlord.png
```
