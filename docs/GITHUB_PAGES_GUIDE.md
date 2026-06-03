# GitHub Pages 更新手順

## 初回公開

1. GitHubでリポジトリを作成
2. ZIPを解凍
3. 解凍したフォルダの中身をリポジトリ直下にアップロード

```text
index.html
css/
js/
assets/
docs/
README.md
```

4. GitHubの `Settings` を開く
5. `Pages` を開く
6. Sourceを `Deploy from a branch` にする
7. Branchを `main / root` にする
8. Save
9. 表示されたURLを開いて確認

## 更新するとき

1. 新しいZIPをダウンロード
2. ZIPを解凍
3. リポジトリ内の古いファイルを置き換える
4. 変更をCommit
5. GitHub PagesのURLで確認

## 注意

ZIPファイルそのものをアップロードしてもゲームは動きません。
必ず解凍して、中身をアップロードしてください。

## 1ファイルHTML版について

`monster-links-v*_single.html` は単体確認用です。
GitHub Pagesで運用する場合は、基本的に分割版ZIPを使う方がおすすめです。
