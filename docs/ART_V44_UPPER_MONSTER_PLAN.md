# v4.4 上位モンスター本格アート制作計画

## 目的

v4.4では、画像生成が一覧画像に寄りやすかったため、無理にゲーム素材へ入れず、次に個別PNGとして作る対象を確定します。

## 対象モンスター

|ID|名前|ランク|系統|方向性|保存先|
|---|---|---|---|---|---|
|frostlevia|フロストリヴァイア|A|water|氷と水の上位竜。冷気・海竜感を強める|assets/images/monsters/frostlevia.png|
|arcautomaton|アークオートマタ|A|machine|雷をまとった古代機械兵。金属と青い発光|assets/images/monsters/arcautomaton.png|
|astralwyrm|アストラルワーム|A|light|星空・宇宙感のある光竜|assets/images/monsters/astralwyrm.png|
|auroracat|オーロラニャ|A|light|オーロラ色の猫系モンスター。かわいいが上位感あり|assets/images/monsters/auroracat.png|
|eclipsewolf|エクリプスウルフ|A|dark|月食・影・狼。俊敏な闇アタッカー|assets/images/monsters/eclipsewolf.png|
|gigacore|ギガントコア|A|machine|巨大コアの重機械。重量感と発光コア|assets/images/monsters/gigacore.png|
|phoenixdrake|フェニックスドレイク|S|fire|炎と再生の竜。派手な翼と炎エフェクト|assets/images/monsters/phoenixdrake.png|
|celestiseraph|セレスティアルセラフ|S|light|天界のセラフ。白・金・光翼|assets/images/monsters/celestiseraph.png|

## 作成ルール

```text
1体ずつ個別PNGとして作成する
背景透過にする
文字・一覧表・説明文は入れない
1024x1024の正方形
キャラクターは中央配置
```

## 画像生成時の注意

```text
「アップデート告知画像」や「一覧画像」にしない
「1体だけ」「背景透過PNG」「文字なし」を強く指定する
生成後、白背景や市松模様が焼き付いていたら透過修正してから実装する
```

## 次の実装方針

次回は v4.5 として、以下のように進めるのが安全です。

```text
v4.5-A フロストリヴァイア / アークオートマタ / アストラルワーム / オーロラニャ
v4.5-B エクリプスウルフ / ギガントコア / フェニックスドレイク / セレスティアルセラフ
```

8体を一気に作るより、4体ずつ作って確認した方が失敗が少ないです。
