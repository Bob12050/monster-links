# v7.2.1 既存レシピ重複修正

## 目的

v7.2作成時の検証で、既存レシピに親ペア重複が見つかったため修正しました。

## 修正前の重複

```text
gloomoth+luminel
```

## 問題

`gloomoth + luminel` が複数の結果に使われていました。

```text
gloomoth + luminel → crystagon
gloomoth + luminel → doomgazer
```

この状態だと、配合リストには表示されていても、内部のレシピ判定では先に見つかった結果が優先され、`doomgazer` 側が実質作れない可能性がありました。

## 修正内容

```text
修正前:
gloomoth + luminel → doomgazer

修正後:
hellknight + luminel → doomgazer
```

## 修正後の重複

```text
なし
```

## 変更していないもの

```text
追加モンスター
モンスター能力値
ステージ出現
スカウト率
ドロップ
v7.2で追加した17件の新レシピ
```
