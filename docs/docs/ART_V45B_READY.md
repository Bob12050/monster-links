# v4.5-B 残り上位4体 本格アート差し替え準備版

## 今回の判断

画像生成が「一覧画像」「告知画像」になってしまったため、ゲーム素材としては採用しません。

v4.5-Bでは、残り4体の個別PNG差し替え準備だけを行います。

## 対象モンスター

|ID|名前|ランク|系統|方向性|保存先|
|---|---|---|---|---|---|
|eclipsewolf|エクリプスウルフ|A|dark|月食・影・狼。紫黒の炎、三日月、俊敏なシルエット|assets/images/monsters/eclipsewolf.png|
|gigacore|ギガントコア|A|machine|巨大な鉱石コアと重装甲。中央に発光コア|assets/images/monsters/gigacore.png|
|phoenixdrake|フェニックスドレイク|S|fire|不死鳥と竜の融合。赤橙の翼、炎、再生感|assets/images/monsters/phoenixdrake.png|
|celestiseraph|セレスティアルセラフ|S|light|天界のセラフ。白金の鎧、光翼、神聖感|assets/images/monsters/celestiseraph.png|

## 採用する画像の条件

```text
1体だけ
文字なし
ラベルなし
一覧画像ではない
背景透過
1024x1024
中央配置
```

## 採用しない画像

```text
4体セット画像
アップデート告知画像
名前ラベル付き画像
背景が焼き付いている画像
切り抜き前提の画像
```

## 次の実装

個別PNGが4体分そろったら、以下に配置します。

```text
assets/images/monsters/eclipsewolf.png
assets/images/monsters/gigacore.png
assets/images/monsters/phoenixdrake.png
assets/images/monsters/celestiseraph.png
```

その後、`ART_ASSET_MANIFEST` の status を `done_v4_5_b_art` に更新します。
