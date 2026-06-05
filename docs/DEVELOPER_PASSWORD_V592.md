# v5.9.2 開発者モード簡易パスワード追加

## 今回の目的

友達が誤って開発者モードを使わないように、開発者モードON時に簡易パスワードを追加しました。

## 初期パスワード

```text
rei-dev
```

## 使い方

```text
設定・セーブ
↓
開発者モード ON
↓
パスワード入力
↓
メニューに開発者モードが表示
```

## パスワード変更方法

```text
js/core/config.js
```

の以下を変更します。

```text
const DEV_PASSWORD = "rei-dev";
```

## 注意点

```text
これはブラウザ内の簡易ロックです
本格的なセキュリティではありません
ソースコードを見られるとパスワードは確認できます
友達にURLを送る時の誤操作防止用です
```

## 触ったファイル

```text
js/core/config.js
js/core/data.js
js/systems/devtools.js
js/views/settingsView.js
css/style.css
docs/DEVELOPER_PASSWORD_V592.md
```
