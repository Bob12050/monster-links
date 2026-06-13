# Monster Links 現行プロジェクト仕様書

更新日: 2026-06-13
対象バージョン: v8.6-A.28

この文書は、普通のChatGPTや別の開発担当へプロジェクトを引き継ぐための現行仕様書です。
古いdocsと内容が異なる場合は、この文書と実際のゲームコードを優先してください。

## 1. プロジェクト概要

Monster Linksは、スマートフォンとPCで遊べるソロ向けモンスター育成・配合RPGです。

```text
公開方式: GitHub Pages
構成: HTML / CSS / JavaScript / JSON / 画像
サーバー: 不使用
ビルド環境: 不使用
外部API: 不使用
パッケージ管理: 不使用
```

`index.html`を入口とする完全な静的サイトです。
ES Modules、fetch必須処理、サーバー専用機能を追加しないでください。

## 2. 最重要ルール

```text
受け取った最新ZIPまたはフォルダのファイルを必ず最新版として扱う
過去の会話や古いdocsより実ファイルを優先する
既存セーブデータの互換性をなるべく維持する
変更範囲を必要最小限にする
変更したファイルを回答で明示する
ゲームデータを変更した場合は理由を説明する
画像だけの更新で能力・配合・セーブ形式を変えない
GitHub Pagesのmain / rootで動く状態を維持する
```

## 3. 現在の規模

```text
モンスター: 84体
ステージ: 13件
配合レシピ: 83件
JavaScript: 45ファイル
CSS: 1ファイル
ルートdocs Markdown: 142ファイル
モンスター画像: PNG 75 / SVG 64
```

PNGとSVGが両方あるモンスターもいます。
ゲーム内で参照する画像は`js/core/monsters.js`の`image`を確認してください。

## 4. 主なゲーム機能

```text
通常探索、ボス戦、スカウト
通常攻撃オート戦闘
戦闘速度4段階、効果音、演出軽減
育成、装備、性格、個体値
1枠 / 2枠 / 3枠モンスター
合計3枠のパーティ編成
牧場とパーティの一括交換
完全固定2体配合、レア配合、4体配合
配合結果プレビューとスキル継承
配合目標と素材進捗
図鑑検索、フィルター、配合ルート
任務、配合研究依頼、一括報酬受取
ワールドマップ、闘技場、商店
3つのセーブスロット
セーブデータのバックアップと復元
開発者モード
```

## 5. ファイル構成と責務

```text
index.html                 読み込み順とアプリ入口
css/style.css              全画面の見た目

js/core/config.js          バージョン、保存キー、属性、基本定数
js/core/monsters.js        モンスター定義
js/core/skills.js          特技定義
js/core/items.js           アイテム・装備定義
js/core/stages.js          ステージ・敵・ボス定義
js/core/recipes.js         配合レシピ
js/core/quests.js          任務定義
js/core/state.js           セーブ、状態、移行、共通計算

js/systems/                ゲーム処理
js/views/                  画面HTML生成

assets/images/monsters/    モンスター画像
assets/images/stages/      ステージ背景
assets/images/items/       アイテム画像

tools/validate.mjs         総合回帰検証
tools/art-audit.mjs        モンスター画像管理表の監査・生成
manifest.webmanifest       ホーム画面追加・standalone表示設定
service-worker.js          更新優先のPWAキャッシュ制御
js/pwa.js                  Service Worker登録・更新確認
```

## 6. セーブ互換性

```text
旧セーブキー: monster_links_split_v1
現在のスロット接頭辞: monster_links_slot_
現在のスロット選択キー: monster_links_active_slot
スロット数: 3
SAVE_SCHEMA_VERSION: 1
```

保存処理と移行処理は`js/core/state.js`にあります。

守ること:

```text
既存プロパティを安易に削除・改名しない
新規プロパティには既定値を用意する
古いセーブをnormalizeStateで補完できるようにする
互換性を壊す変更ではSAVE_SCHEMA_VERSIONと移行処理を検討する
アート・CSS・表示のみの変更ではセーブ形式を変更しない
```

## 7. パーティ仕様

```text
合計上限: 3枠
1枠モンスター: 最大3体
2枠モンスター: 1枠モンスターと組み合わせ可能
3枠モンスター: 1体のみ
パーティには最低1体必要
満員時は牧場から一括交換する
```

関連:

```text
js/core/config.js
js/core/state.js
js/systems/monster.js
js/views/monsterView.js
```

## 8. UI方針

```text
スマホを主対象にしつつPCにも対応
重要ボタンは十分なタップ領域を確保
重要情報を10px未満にしない
現在地と次に行うことを分かりやすくする
一画面へ情報を詰め込みすぎない
既存のタイトル・拠点・戦闘の世界観を維持する
```

v8.6-A.1で現在地表示、フォーカス表示、主要画面の可読性を改善済みです。
次のUI候補は、初回チュートリアル、詳細画面整理、配合の親選択短縮です。

## 9. アート方針

採用済み10体を基準画風として維持し、それ以外の74体を同じ画風へ再設計する方針です。

```text
日本の王道ファンタジーRPGらしいオリジナルモンスター
太く明快な輪郭
鮮やかで透明感のある色
滑らかなセル塗り
シンプルで強いシルエット
親しみやすさと魔物らしさの両立
低ランクでも弱々しくしすぎない
高ランクは体格、牙、爪、角、翼などで強さを表現
既存作品のキャラクターを模倣しない
```

ゲーム用画像仕様:

```text
PNG
1024 x 1024
背景透過
全身中央配置
画像端から10〜15%程度の余白
文字、ロゴ、枠、透かしなし
```

### デザインを維持する10体

以下は2026年6月7日に確認・実装済みです。

```text
phoenixdrake     フェニックスドレイク
celestiseraph    セレスティアルセラフ
venomchimera     ヴェノムキマイラ
omegaframe       オメガフレーム
chaoswyrm        カオスワーム
eclipsewolf      エクリプスウルフ
gigacore         ギガントコア
glacierfang      グレイシャーファング
solarwyrm        ソーラーウィルム
nightmarestag    ナイトメアスタッグ
```

### ぷるミン

`plim`の名前は「ぷるミン」のまま維持します。
ユーザーが提示した、青いしずく型、垂れた先端、小さな双葉、丸い瞳、控えめな笑顔のデザインへ変更予定です。
現在のゲーム画像へはまだ反映されていないため、提供される最新版ZIPと参考画像を確認してください。

### 全面刷新対象

上記10体以外の74体は、既存画像が技術上`formal_png`でも再デザイン対象です。
アート管理表の`formal_png`はファイル状態であり、今回の創作上の承認状態とは一致しません。

## 10. アート制作手順

```text
1. 参考画像と個別プロンプトで白背景版を生成
2. ユーザーがデザインを確認
3. 承認後に背景透過PNGを生成
4. ファイル名をモンスターIDと一致させる
5. 旧PNGをlegacyフォルダへ保存
6. 1024x1024、透明四隅、余白を確認
7. ゲームへ反映
8. 管理表とバージョン履歴を更新
9. 回帰検証
```

確認前の画像をゲームへ組み込まないでください。

## 11. 画像の参照規則

```text
assets/images/monsters/{id}.png
assets/images/stages/{id}.png
assets/images/items/{id}.png
```

原則としてPNGを優先し、なければSVG、最後に絵文字へフォールバックします。

## 12. 検証

変更後は可能なら次を実行してください。

```powershell
node tools/validate.mjs
node tools/art-audit.mjs
```

管理表を再生成する場合:

```powershell
node tools/art-audit.mjs --write
```

PWA更新時は、`GAME_VERSION`、`index.html`の`?v=`、`service-worker.js`、`js/pwa.js`のバージョンを必ず一致させてください。
オンライン時はネットワーク優先、通信不能時だけ現行バージョンのキャッシュへフォールバックします。
更新頻度が高いため、旧キャッシュを残す変更やcache-firstへの変更は禁止です。

検証対象:

```text
JavaScript構文
index.htmlの参照
旧セーブ移行
パーティ交換
主要画面生成
モンスター・ステージ・配合・画像参照
アート管理漏れ
```

## 13. バージョン更新

バージョン表示は最低でも以下を揃えます。

```text
js/core/config.js
index.html
README.md
docs/CURRENT_VERSION.md
docs/VERSION_HISTORY.md
```

小規模な文書追加だけでは、必ずしもゲームバージョンを上げる必要はありません。

## 14. 禁止・注意事項

```text
外部サーバーを前提にしない
Node/npmビルドを公開条件にしない
React、Vueなどへ全面移行しない
既存セーブを無断で破壊しない
既存のIDを安易に変更しない
配合結果や能力を画像更新と同時に変更しない
ユーザー確認前のアートを正式反映しない
docs/index.htmlをGitHub Pages公開元として使わない
古いdocs/docsやdocs/assetsを最新版と誤認しない
```

## 15. 現在の次候補

```text
採用済み10体を除く74体のキャラクターアート再設計
序盤8体のデザイン作成
初回プレイの案内とチュートリアル改善
モンスター詳細画面の情報整理
配合画面の親選択フロー短縮
重複docsの安全な整理
```

ユーザーの最新判断を常に優先し、作業開始前に最新版ZIPの内容を確認してください。
