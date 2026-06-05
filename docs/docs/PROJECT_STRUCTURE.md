# ファイル構成

```text
index.html              ゲーム本体を読み込むHTML
css/style.css           見た目
js/core/                データ・設定・状態管理
js/systems/             戦闘・配合・闘技場などの処理
js/views/               画面表示
assets/images/          画像素材
docs/                   編集・管理用ガイド
README.md               全体説明
```

## js/core

```text
config.js       バージョン、属性、性格、基本設定
balance.js      経験値、GOLD、スカウト率などの調整値
skills.js       スキル定義
monsters.js     モンスター定義
items.js        装備・ドロップ定義
stages.js       ステージ定義
arena.js        闘技場大会定義
recipes.js      配合レシピ
quests.js       任務
state.js        セーブデータ・状態管理
utils.js        共通関数
data.js         データ統合
```

## js/systems

```text
battle.js       通常戦闘・ボス戦
arena.js        闘技場処理
fusion.js       配合処理
monster.js      仲間管理
quest.js        任務処理
shop.js         どうぐ屋
```

## js/views

```text
titleView.js        タイトル画面
homeView.js         拠点
stageView.js        冒険
battleView.js       戦闘画面
fusionView.js       配合画面
arenaView.js        闘技場画面
dexView.js          図鑑
monsterView.js      仲間画面
settingsView.js     設定・セーブ
menuView.js         メニュー
imageView.js        画像表示補助
uiView.js           拠点ダッシュボードなど
```

## 今後の整理タイミング

以下のどれかに当てはまったら、本格的な分割整理を検討してください。

```text
css/style.css が編集しづらい
monsters.js が長くなりすぎる
stages.js や arena.js がさらに増える
fusion.js に新機能を大量追加する
```

現時点では、大規模整理はまだ不要です。
