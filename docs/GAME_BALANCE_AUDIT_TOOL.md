# 300周キャンペーン監査ツール

`tools/campaign-audit.mjs` は、Monster Links の新規セーブから天空遺跡ボス初回制覇までを1周として反復する、読み取り専用の難易度・仕様監査ツールです。

既存の `progression-audit.mjs` は、理論上到達できるモンスターを任意レベルで直接生成する静的な見積もりです。キャンペーン監査はそれとは分けて、本体のState/Game APIをNode VM内で実行します。ダメージ、敵AI、報酬、ドロップ、スカウト、成長、任務、配合条件は本番コードを使用します。

## 実行

```text
node tools/campaign-audit.mjs --runs=300 --seed=85700 --max-boss-losses=80 --verify-determinism
```

既定では300周を次の3方針へ交互に割り当てます。

- 速攻: 攻撃優先。序盤の3枠確保後は収集を抑え、修練を積極利用
- バランス: 本体のバランスオート、各地域で1種のスカウトを狙う
- 収集・配合: 回復優先オート、未入手種・笛・成立済み配合を優先

すべての方針が、現行仕様で利用できる無料キャンプ回復、任務・冒険者ランク報酬、3枠内の編成最適化を利用します。闘技場EXと図鑑100%は本編完走とは別スコープです。

主なオプション:

```text
--runs=300
--seed=85700
--profiles=rush,balanced,collector
--max-battles=1000
--max-turns=400
--max-boss-losses=80
--out=docs/audits/v8.6-A.57-campaign-300
--verify-determinism
--quiet
```

`--verify-determinism` は先頭最大12周を同じseedで再実行し、campaign/stage明細のSHA-256が一致することを確認します。

## 出力

既定の出力先は `docs/audits/v<GAME_VERSION>-campaign-<runs>/` です。

- `audit-summary.json`: 方法、主要指標、方針別・地域別集計、問題、修正案
- `overview.csv`: 全300周の主要指標
- `profile-metrics.csv`: 方針別集計とWilson 95%信頼区間
- `campaigns.csv`: 1周1行の完走・戦闘・経済・収集・配合指標
- `campaign-stage-runs.csv`: 周回×地域の明細
- `stage-metrics.csv`: 地域別集計
- `findings.csv`: 優先度付き問題一覧
- `artifact.json`: ポータブルHTMLレポートの正規入力
- `report.html`: リリース時に `artifact.json` から生成する単一の閲覧用レポート
- `report-verification.json`: HTMLの検証結果（表示幅、チャート、ソース操作）
- `queries/*.sql`: レポートの各CSV投影を再現するソース表示用クエリ

CSVはExcel等で再分析でき、JSONにはgame version、Git revision、本体ソースhash、run signatureを保存します。

閲覧用レポートの再生成:

```text
node tools/build-campaign-audit-report.mjs --input docs/audits/v8.6-A.57-campaign-300/artifact.json --output docs/audits/v8.6-A.57-campaign-300/report.html
```

このビルダーはCodexのData Analyticsポータブルレポート基盤を使用し、PC 1440pxとスマホ390pxの表示・ソース表示操作を検証してから出力を確定します。

## 読み方

- 監査上限は既定で1周1,000戦、1戦400ターン、各ボス敗北80回です。上限到達は未完走として停止理由を記録します。
- 「完走率」は実ユーザーの完走率ではなく、明示したボット方針の監査上限内完走率です。Wilson 95%信頼区間を付け、300周全体で50%付近の最大誤差は約±5.7ptです。
- 方針別は約100周なので最大誤差は約±9.8ptです。8pt未満の小差を断定材料にしません。
- `avg_extra_normal_wins` はボス解放条件を超えて必要になった追加通常勝利です。
- `guard_loop_battle_rate` は連続防御5回以上の戦闘比率です。
- 50/100ターン超、戦闘数上限、ターン上限、ボス敗北上限は進行停止候補として記録します。ターン上限へ達した戦闘も1戦・全ターンとして集計します。
- 修正案比較は必ず同じ300 seedを使い、1変数ずつpairedで比較します。

## 実装上の境界

プレイヤーの「どの仲間を編成するか」「いつスカウトするか」は方針モデルです。一方、戦闘と状態変化は `tools/lib/headless-game-runtime.mjs` が本体IIFEを読み込み、公開APIを直接動かします。

このツールはゲームデータ、セーブ、PWA、バランス値を変更しません。監査結果から修正を実装する場合は、別の変更として同じseedを再実行してください。
