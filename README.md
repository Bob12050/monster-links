# モンスターリンクス v8.6-A.4

スマホでも遊べる、ソロ向けモンスター育成・配合RPGです。

## 現在の安定版

```text
v8.6-A.4 闇・毒系／ドラゴン系アート実装
```

## v8.6-A.4の主な変更

- ドラゴン系7体と闇・毒系12体の採用済みアートを既存IDのまま実装
- 採用元画像19枚を透過1024×1024 PNGへ整え、旧画像を退避
- `heavenscale` と `zenithdragon` をSVGから正式PNGへ切り替え
- セーブ形式、配合、能力値、モンスターID、ランクは変更なし

## v8.6-A.3.1の主な変更

- 通常探索・ボス戦の勝利、スカウト成功、敗北後にマップ選択画面へ戻るよう改善
- リザルト画面へ「もう一度探索する」ボタンを追加
- 同じ地点と通常探索・ボス戦の種別を保ったまま再挑戦可能
- セーブ形式、配合、能力値、モンスターIDは変更なし

## v8.6-A.3の主な変更

- 既存IDの追加モンスターアートを実装用PNGとして反映
- 水・氷・深海系から `frostpup`, `snowfairy`, `snowcat`, `shellgolem` を反映
- 機械系から `gearcat`, `steelbug`, `ironmantis`, `thunderdrone`, `forgegolem`, `skywarden`, `arkmachine` を反映
- 旧画像を `assets/images/monsters/legacy/v8.6-A.2-before-additional-art/` に退避
- セーブ形式、配合、能力値、モンスターIDは変更なし

## v8.6-A.2の主な変更

- 既存IDの採用済みモンスターアートを実装用PNGへ差し替え
- `gearslime` の表示名を「ギアぷるミン」へ変更
- `mossking` の表示名を「コケヌシ」へ変更
- 旧画像を `assets/images/monsters/legacy/v8.6-A.1-before-existing-id-art/` へ退避
- セーブ形式、配合、能力値、モンスターIDは変更なし

## v8.6-A.1の主な変更

```text
上部バーへ現在の画面名を追加
下部ナビの現在地を読み上げ可能に改善
キーボード操作時のフォーカス表示を追加
戦闘・仲間・図鑑・配合・任務・マップの極小文字を拡大
スマホの説明文と操作ボタンを読みやすく調整
セーブ形式の変更なし
```

## ゲーム概要

```text
敵を倒す
仲間をスカウトする
装備で強化する
図鑑から育成目標を決める
素材を集めて配合する
任務を達成して報酬を受け取る
ボスを倒して次のステージへ進む
```

## 主な機能

```text
ステージ探索・ボス戦・スカウト
通常攻撃オート戦闘
4段階の戦闘速度・効果音・演出軽減
モンスター育成・装備
1枠/2枠/3枠のパーティ管理
牧場からのパーティ一括交換
固定配合・通常配合・特殊配合
配合目標・素材進捗
配合研究任務・一括報酬受取
図鑑検索・配合ルート・素材逆引き
仲間検索・フィルター
メイン任務・サブミッション
闘技場・商店
複数セーブスロット
バックアップ・復元
遊び方・開発者モード
```

## 現在の素材・ファイル状況

```text
モンスター画像: 84（PNG 75 / SVG 9）
ステージ背景: 13（PNG 12 / SVG 1）
アイテム画像: 28（PNG 25 / SVG 3）
JavaScriptファイル: 44
CSSファイル: 1
docs Markdownファイル: 141
```

## 更新手順

```text
1. 配布ZIPを解凍
2. 中身だけをGitHub用フォルダに上書き
3. GitHub DesktopでCommit
4. Push origin
5. GitHub Pagesの公開URLで確認
```

## 重要docs

```text
docs/CURRENT_VERSION.md
docs/SKY_RUINS_BALANCE_V852.md
docs/WORLD_MAP_V851.md
docs/SKY_RUINS_V85.md
docs/QUEST_FUSION_GOALS_V842.md
docs/FUSION_GOALS_V832.md
docs/AUTO_BATTLE_V841.md
docs/BATTLE_TEMPO_SOUND_V84.md
docs/MONSTER_PASTURE_UI_V831.md
docs/PROJECT_SPEC_CHATGPT.md
docs/CHATGPT_HANDOFF_PROMPT.md
docs/CHATGPT_WORKFLOW.md
docs/VERSION_HISTORY.md
```

## 将来の方針

```text
ワールドマップに地域別の装飾と発見イベントを追加
採用済み10体を基準に、ぷるミンを含む残り74体のキャラクターを順次再設計
モンスター150匹規模を目指す
SS/SSSランクを将来追加
4体配合を長期的に追加
育成・配合・収集を繰り返したくなる体験へ仕上げる
```
