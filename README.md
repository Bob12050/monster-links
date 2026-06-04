# モンスターリンクス v5.1

スマホで遊べる、ソロ向けモンスター育成・配合RPGです。

## 現在の正式版

```text
v5.0
```

この版は、新機能追加ではなく **管理整理・正式版確認** のための版です。

## 主な内容

```text
ステージ探索
ボス戦
モンスター育成
スカウト
配合
装備
図鑑
任務
闘技場
複数セーブ
```

## 現在の強化状況

```text
モンスター画像PNG: 55
ステージ背景PNG: 12
アイテム画像ファイル: 27
JavaScriptファイル: 37
CSSファイル: 1
```

## 主要フォルダ

```text
css/                    スタイル
js/core/                設定・データ
js/systems/             ゲーム処理
js/views/               画面表示
assets/images/monsters/ モンスター画像
assets/images/stages/   ステージ背景
assets/images/items/    アイテム画像
docs/                   開発メモ・管理資料
```

## 更新時の基本手順

```text
1. ZIPを解凍
2. 中身だけをGitHub用フォルダに上書き
3. GitHub DesktopでCommit
4. Push origin
5. 公開URLで確認
```

## 重要なdocs

```text
docs/CURRENT_VERSION.md
docs/FILE_STRUCTURE.md
docs/MAINTENANCE_CHECKLIST.md
docs/ROADMAP_AFTER_V50.md
docs/DOC_INDEX.md
docs/VERSION_HISTORY.md
```

## 今後の方針

```text
ステージギミックは入れない
大規模なコード分割はまだしない
次はアイテム・装備画像の本格化が有力
```


## v5.0 アイテム・装備画像の本格化

今回は、全アイテムをPNGアイコン化して、装備・報酬の見た目を強化しました。

```text
アイテムPNG: 25
items.jsの画像参照を .png に統一
報酬アイコン・小アイコンの見た目を強化
```

追加ファイル:

```text
docs/ITEM_ART_V50.md
```

戦闘バランスやアイテム性能には触っていません。


## v5.1 UI・画面の見た目整理

今回は、ゲーム画面全体の見やすさと統一感を整えました。

```text
ホーム画面の説明文更新
カードの余白・影・境界線調整
メニューボタンの見やすさ改善
ステージカードの情報表示を微調整
スマホ表示の余白調整
```

追加ファイル:

```text
docs/UI_POLISH_V51.md
```

戦闘バランスやゲームデータには触っていません。
