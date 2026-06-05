# モンスターリンクス v7.0

スマホでも遊べる、ソロ向けモンスター育成・配合RPGです。

## 現在の安定版

```text
v7.0 追加モンスター第1弾：ステージ出現追加
```

## ゲーム概要

```text
敵を倒す
仲間をスカウトする
装備で強化する
配合で新しい仲間を作る
ボスを倒して次のステージへ進む
```

## 主な機能

```text
ステージ探索
ボス戦
スカウト
モンスター育成
配合
配合リストから配合セット
装備
図鑑検索/フィルター
仲間検索/フィルター
任務
闘技場
複数セーブスロット
遊び方ページ
開発者モード
開発者モード簡易パスワード
全キャラ入手
修練の書・スカウト笛のまとめ買い
```

## 現在の素材・ファイル状況

```text
モンスターPNG: 55
ステージ背景PNG: 12
アイテムPNG: 25
JavaScriptファイル: 41
CSSファイル: 1
docsファイル: 70
```

## 更新手順

```text
1. 分割版ZIPを解凍
2. 中身だけをGitHub用フォルダに上書き
3. GitHub DesktopでCommit
4. Push origin
5. GitHub Pagesの公開URLで確認
```

## 重要docs

```text
docs/CURRENT_VERSION.md
docs/LIGHT_CODE_CLEANUP_V65.md
docs/FILE_STRUCTURE_V65.md
docs/QUALITY_CHECK_V65.md
docs/CLEANUP_ROADMAP_V65.md
docs/DOC_INDEX_V65.md
docs/VERSION_HISTORY.md
```

## 将来の方針

```text
モンスター150匹規模を目指す
SS/SSSランクを将来追加
1枠・2枠・3枠サイズ制を将来追加
4体配合を長期的に追加
ドラクエモンスターズ風の育成・配合体験に寄せる
```

## v6.5の内容

```text
README整理
現在版情報更新
ファイル構成表追加
品質チェック手順追加
今後の整理ロードマップ追加
docs索引更新
```

## v6.5で変更していないもの

```text
戦闘バランス
配合内容
アイテム性能
ステージ構成
画像アセット
画面UI
```


## v7.0 追加モンスター第1弾：ステージ出現追加

150匹規模へ拡張する前に、既存キャラデザイン確認と追加第1弾の管理表を追加しました。

```text
既存55体のキャラデザ確認表
モンスター画像チェックリスト
追加モンスター第1弾 20体案
キャラデザイン方針
```

追加ファイル:

```text
docs/CHARACTER_DESIGN_REVIEW_V66.md
docs/MONSTER_ADDITION_BATCH1_PLAN_V66.md
docs/MONSTER_ASSET_CHECKLIST_V66.md
docs/CHARACTER_DESIGN_DIRECTION_V66.md
```

モンスター本体・画像・配合内容・戦闘バランスは変更していません。


## v7.0 追加モンスター第1弾：ステージ出現追加

追加モンスター第1弾20体のID・名前・ランク・属性・画像ファイル名・画像生成プロンプトを確定しました。

```text
追加候補20体
画像生成プロンプト20体分
JSON管理ファイル
monsters.js追加時の仮コード
```

追加ファイル:

```text
data/planned_monsters_batch1_v67.json
docs/MONSTER_BATCH1_DATA_V67.md
docs/MONSTER_BATCH1_PROMPTS_V67.md
docs/MONSTER_BATCH1_IMPLEMENTATION_NOTES_V67.md
```

今回はまだゲーム本体への正式追加、画像追加、ステージ出現、配合レシピ追加は行っていません。


## v7.0 追加モンスター第1弾：ステージ出現追加

v6.7で決めた追加候補20体について、透明PNGの仮画像を追加しました。

```text
追加候補20体の仮画像PNG
画像レビュー表
画像管理JSON
```

追加ファイル:

```text
data/planned_monsters_batch1_v68.json
docs/MONSTER_BATCH1_IMAGES_V68.md
docs/MONSTER_BATCH1_IMAGE_REVIEW_V68.md
```

今回はまだmonsters.jsへの正式追加、ステージ出現、配合レシピ追加は行っていません。


## v7.0 追加モンスター第1弾：ステージ出現追加

v6.7でデータ枠を作り、v6.8で仮画像を用意した20体を、正式に `js/core/monsters.js` へ追加しました。

```text
追加前: 55体
追加後: 75体
追加数: 20体
```

追加ファイル:

```text
data/planned_monsters_batch1_v69.json
docs/MONSTER_BATCH1_FORMAL_ADD_V69.md
docs/MONSTER_BATCH1_BALANCE_V69.md
```

今回はまだステージ出現・配合レシピ・ドロップは追加していません。


## v7.0 追加モンスター第1弾：ステージ出現追加

v6.9で正式追加した20体のうち、通常出現向けの13体を各ステージに配置しました。

```text
総モンスター数: 75
通常出現追加: 13体
未配置: 7体
```

追加ファイル:

```text
data/planned_monsters_batch1_v70.json
docs/MONSTER_BATCH1_STAGE_APPEARANCE_V70.md
docs/STAGE_APPEARANCE_CHECKLIST_V70.md
```

今回はまだ配合レシピ、ドロップ、新ボス、正式な2枠/3枠制限は追加していません。
