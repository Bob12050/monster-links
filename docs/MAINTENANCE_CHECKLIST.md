# 更新前チェックリスト

## ZIPを作る前

```text
GAME_VERSIONが正しい
index.htmlのtitleが正しい
READMEに最新版が書かれている
docsに更新内容が書かれている
画像パスが存在している
```

## 画像追加時

```text
1体ずつ個別PNGで追加する
文字入り画像を使わない
一覧画像を使わない
背景透過を確認する
assets/images/monsters/{id}.png に置く
必要なら monsters.js の image を .png にする
```

## ステージ追加時

```text
stages.jsに定義を追加
背景画像を assets/images/stages/{id}.png に置く
ボス設定を確認
unlock / req / min / max を確認
danger / traits / drops / hint を追加
```

## GitHub Desktop更新時

```text
ZIPを解凍する
中身だけをGitHub用フォルダに上書きする
GitHub DesktopでCommitする
Push originする
公開URLで確認する
```

## やらない方がいいこと

```text
ZIPファイルそのものをGitHubにアップロードしない
解凍フォルダごとGitHub用フォルダに入れない
GitHubブラウザ画面で大量ファイルをUploadしない
GitHub DesktopのAdd local repositoryに解凍フォルダを入れない
```
