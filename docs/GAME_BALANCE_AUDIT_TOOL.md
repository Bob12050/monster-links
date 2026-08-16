# 300周キャンペーン監査ツール

`tools/campaign-audit.mjs` は、Monster Links の新規セーブから天空遺跡ボス初回制覇までを1周として反復する、読み取り専用の難易度・仕様監査ツールです。

既存の `progression-audit.mjs` は、理論上到達できるモンスターを任意レベルで直接生成する静的な見積もりです。キャンペーン監査はそれとは分けて、本体のState/Game APIをNode VM内で実行します。ダメージ、敵AI、報酬、ドロップ、スカウト、成長、任務、配合条件は本番コードを使用します。

## 実行

優先修正の専用回帰試験は単独でも実行できます。通常モードは人が読む5/5結果、`--json` は監査へ埋め込める決定的なレシートを返します。

```text
node tools/priority-fixes-test.mjs
node tools/priority-fixes-test.mjs --json
```

JSONレシートにはschema/test version、GAME_VERSION、本体source hash、成功/失敗件数、5件の固定test idとstatusを保存し、時刻や絶対パスは含めません。キャンペーン監査はシミュレーション開始前にこのJSON試験を自動実行し、5/5成功・GAME_VERSION・source hash一致を検証します。いずれかが不一致なら監査を中止し、解消済み指摘を出力しません。

```text
node tools/campaign-audit.mjs --runs=300 --seed=85700 --max-boss-losses=80 --verify-determinism
```

修正版を同一条件の既存監査と比較する場合は、baseline監査フォルダを指定します。

```text
node tools/campaign-audit.mjs --runs=300 --seed=85700 --max-boss-losses=80 --verify-determinism --baseline=docs/audits/v8.6-A.57-campaign-300 --out=docs/audits/v8.6-A.58-campaign-300
```

`--baseline` はbaseline側の `runs`、`seed`、方針の並び、1周戦闘上限、1戦ターン上限、ボス敗北上限が現行実行と完全一致することを検証します。さらにcampaignのrun/profile/seedと、地域明細のrun/profile/stageを1対1で照合し、不一致時は実行を停止します。

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
--out=docs/audits/v8.6-A.58-campaign-300
--baseline=docs/audits/v8.6-A.57-campaign-300
--verify-determinism
--quiet
```

`--verify-determinism` は先頭最大12周を同じseedで再実行し、campaign/stage明細のSHA-256が一致することを確認します。

## 天空ボスの1変数実験

天空遺跡ボスのHP補正だけを試す場合は、A/B両群を同じ監査ツール・本体ソース・seedで実行します。実験値は監査VM内だけへ適用され、ゲーム本体、セーブ、PWAは変更しません。

```text
node tools/campaign-audit.mjs --runs=300 --seed=85700 --max-boss-losses=80 --verify-determinism --sky-boss-hp-boost=control --out=.audit-runs/a59-discovery/control

node tools/campaign-audit.mjs --runs=300 --seed=85700 --max-boss-losses=80 --verify-determinism --sky-boss-hp-boost=.35 --baseline=.audit-runs/a59-discovery/control --out=.audit-runs/a59-discovery/hp-035

node tools/evaluate-sky-balance-experiment.mjs --phase=discovery --baseline=.audit-runs/a59-discovery/control --candidate=.audit-runs/a59-discovery/hp-035 --out=.audit-runs/a59-discovery/hp-035-evaluation.json
```

`control` は本体の実効補正 `{hp:.45,mp:.2,atk:.12,def:.12,wis:.12}` を検証する明示対照です。数値候補はこの完全なobjectを複製し、`hp`だけを差し替えます。部分objectにして他の能力補正を欠落させる実験は拒否します。

実験flagは、固有の `--out` と `--verify-determinism` が必須です。数値候補には同じtool source hash・runtime source hashで生成した明示対照 `--baseline` も必須です。比較時には天空より前の12地域について全出力列、天空では到達・入口Lv・初回ボス開始Lv・入口Gを照合し、処置前の差があれば停止します。

監査summaryは次の3署名を保存します。

- `resultSignature`: campaign/stage結果だけの従来互換SHA-256
- `runSignature`: 実効ボス補正scenarioと結果を結び付けるSHA-256
- `executionSignature`: tool、本体source、GAME_VERSION、実行モードまで含む来歴SHA-256

採用判定はA.58対照で天空へ到達した同一組を固定分母にします。主条件は、突破率のpaired差が+10pt以上かつprofile層別paired bootstrap 95%区間の下限が0超、未突破を80回扱いした挑戦負荷の差が0未満かつ区間上限も0未満です。天空停止数、天空戦闘数P90、全campaign P90、バランス/収集それぞれの突破数、自動防御を非劣化guardrailにします。過度な弱体化を防ぐ上限は突破率85%・初回成功20%です。75–80%の絶対突破率自体は、ユーザーテスト由来の目標ではないため診断値として併記します。

候補選択に使ったseed集合は探索用です。採用候補は、別に事前固定したseedでA.58対照300周と正式版300周をpaired再実行し、判定器を `--phase=holdout` で通してから公開します。holdoutは探索seed 85700を拒否します。`.audit-runs/` はローカルの再生成可能な実験群で、レビュー済みの正式監査だけを `docs/audits/` へ保存します。

## 出力

既定の出力先は `docs/audits/v<GAME_VERSION>-campaign-<runs>/` です。

- `audit-summary.json`: 方法、主要指標、方針別・地域別集計、問題、修正案
- `overview.csv`: 全300周の主要指標
- `profile-metrics.csv`: 方針別集計とWilson 95%信頼区間
- `campaigns.csv`: 1周1行の完走・戦闘・経済・収集・配合指標
- `campaign-stage-runs.csv`: 周回×地域の明細
- `stage-metrics.csv`: 地域別集計
- `findings.csv`: 優先度付き問題一覧
- `priority-fixes-verification.json`: 監査前に実行した優先修正5件の機械可読回帰レシート
- `baseline-comparison.csv`: baseline/current全体指標と完走状態のpaired遷移（`--baseline` 指定時）
- `profile-comparison.csv`: 方針別のbaseline/current完走率・戦闘数（`--baseline` 指定時）
- `focus-stage-comparison.csv`: 星晶の塔・虹晶聖域・深海神殿・天空遺跡の版比較（`--baseline` 指定時）
- `focus-stage-chart.csv`: 重点4地域チャートのbaseline/current long形式（`--baseline` 指定時）
- `artifact.json`: ポータブルHTMLレポートの正規入力
- `report.html`: リリース時に `artifact.json` から生成する単一の閲覧用レポート
- `report-verification.json`: HTMLの検証結果（表示幅、チャート、ソース操作）
- `queries/*.sql`: レポートの各CSV投影を再現するソース表示用クエリ

CSVはExcel等で再分析でき、JSONにはgame version、Git revision、本体ソースhash、scenario、3種類のsignatureと回帰レシートを保存します。`audit-summary.json` と `artifact.json` にも同じレシートを埋め込みます。

閲覧用レポートの再生成:

```text
node tools/build-campaign-audit-report.mjs --input docs/audits/v8.6-A.58-campaign-300/artifact.json --output docs/audits/v8.6-A.58-campaign-300/report.html
```

このビルダーはCodexのData Analyticsポータブルレポート基盤を使用し、PC 1440pxとスマホ390pxの表示・ソース表示操作を検証してから出力を確定します。

## 読み方

- 監査上限は既定で1周1,000戦、1戦400ターン、各ボス敗北80回です。上限到達は未完走として停止理由を記録します。
- 「完走率」は実ユーザーの完走率ではなく、明示したボット方針の監査上限内完走率です。Wilson 95%信頼区間を付け、300周全体で50%付近の最大誤差は約±5.7ptです。この区間は固定ボット方針のseed間変動であり、実ユーザー母集団へ外挿する区間ではありません。
- プロジェクトの目標完走率は未定義です。監査上限内完走率を任意の90%基準などに対する合否として扱わず、目標プレイ時間・許容戦闘数・方針別目標を定義してから評価します。
- 方針別は約100周なので最大誤差は約±9.8ptです。8pt未満の小差を断定材料にしません。
- `avg_extra_normal_wins` はボス解放条件を超えて必要になった追加通常勝利です。
- `guard_loop_battle_rate` は連続防御5回以上の戦闘比率です。
- `guard_loop_battle_rate` が0でも、別原因のターン上限停止などは残り得ます。版比較では連続防御ループ周回率と `stalled_campaigns` を別々に表示します。
- 50/100ターン超、戦闘数上限、ターン上限、ボス敗北上限は進行停止候補として記録します。ターン上限へ達した戦闘も1戦・全ターンとして集計します。
- 比較の「paired」は同じ方針・run番号・初期seedの組を指します。修正により乱数呼び出し回数が変わるため、後続の個々の乱数事象まで共通化する比較ではありません。
- `--baseline` の完走遷移は1対1 pairedです。未完走→完走と完走→未完走のdiscordant pairに、exact two-sided McNemar検定（帰無仮説は両方向が同確率）を適用します。p値が高い小差は、集計完走率改善の証拠とは解釈しません。重点地域の集計平均は各版でその地域へ到達した周回が分母なので、到達数と両版到達組の差分も併読します。
- ボス指摘は、到達後突破率95%未満かつ初回成功/平均挑戦回数の閾値を満たす上位3地域をHIGHの進行壁、突破率95%以上でも平均8回超の地域をMEDIUMの再挑戦負荷として分けます。平均挑戦回数最大と未突破周回数最大も別指標として記述します。
- 複数修正をまとめて実行した比較は版全体の効果であり、各修正の個別因果効果を分離しません。個別効果が必要な場合は1変数ずつ別の出力先で再実行します。
- 配合継承・笛在庫・取得記録のようにボット内で発生頻度が低い仕様修正は、300周の差だけでなく専用回帰試験を主証拠にします。

## 実装上の境界

プレイヤーの「どの仲間を編成するか」「いつスカウトするか」は方針モデルです。一方、戦闘と状態変化は `tools/lib/headless-game-runtime.mjs` が本体IIFEを読み込み、公開APIを直接動かします。方針ドライバの行動は `Game.act(..., fromAuto=true)` として実行し、本番の自動専用状態（自動防御の連続制限を含む）を共有します。手動防御は監査対象外で、制限しません。

自動防御の2手連続禁止は、防御と攻撃を交互に選ぶ状態や別原因の停止戦まで解消する保証ではありません。配合継承から装備由来の過剰値を除く変更は、収集・配合方針の短期成績を下げる可能性もあります。レポートは完走率だけでなく、停止戦・P90戦闘数・方針差を併記します。

このツールはゲームデータ、セーブ、PWA、バランス値を変更しません。監査結果から修正を実装する場合は、別の変更として同じseedを再実行してください。
