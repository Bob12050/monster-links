# v8.0 長期運用向け基盤整備

## 追加したもの

```text
セーブデータ形式番号 saveSchemaVersion
旧セーブを段階的に更新する移行処理
JavaScript構文チェック
HTMLから参照するファイルの存在チェック
モンスター・ステージ・配合・報酬・画像の参照チェック
旧セーブ互換性テスト
GitHub Actionsによるpush / Pull Request時の自動検証
```

## セーブ互換性の方針

```text
GAME_VERSION:
プレイヤーに見せるゲームのバージョン

SAVE_SCHEMA_VERSION:
保存データ構造のバージョン
```

保存データの項目を変更するときは、`SAVE_SCHEMA_VERSION`を1つ上げ、
`js/core/state.js`の`SAVE_MIGRATIONS`へ変換処理を追加します。

既存のセーブには形式番号がないため、初回読み込み時に形式1として保存し直されます。
所持GOLD、仲間、進行状況などの既存項目はそのまま引き継ぎます。

## 自動検証

ローカルで確認する場合:

```text
node tools/validate.mjs
```

GitHubでは`.github/workflows/validate.yml`が自動実行します。
ゲーム本体は従来どおりHTML/CSS/JavaScriptだけで動作し、Node.jsは公開前の検査にだけ使用します。

## 公開元

ルート版と`docs/`版には差があるため、GitHub Pagesは`main / root`を公開元として使用します。
