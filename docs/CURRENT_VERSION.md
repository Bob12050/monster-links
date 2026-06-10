v8.6-A.4 闇・毒系／ドラゴン系アート実装

GAME_VERSIONを8.6-A.4へ更新

主な変更:
- ドラゴン系の `cindrake`, `crystagon`, `volcazard`, `venomhydra`, `prismdragon`, `heavenscale`, `zenithdragon` を実装用PNGへ反映
- 闇・毒系の `gloomoth`, `impfang`, `duskwolf`, `hellknight`, `venomqueen`, `doomgazer`, `demonlord`, `voiddragon`, `eclipsewolf`, `nightmarestag`, `venomchimera`, `venomwing` を実装用PNGへ反映
- 採用元画像19枚を透過1024×1024 PNGへ整形
- 差し替え直前の画像を `assets/images/monsters/legacy/v8.6-A.4-before-approved-art-pack/` へ退避
- セーブ形式、配合、能力値、モンスターID、ランクは変更なし

---

v8.6-A.3.1 探索リザルト導線改善

GAME_VERSIONを8.6-A.3.1へ更新

主な変更:
- 通常探索・ボス戦の勝利、スカウト成功、敗北後の遷移先をマップ選択画面へ統一
- リザルト画面へ「もう一度探索する」ボタンを追加
- 直前の地点と通常探索・ボス戦の種別を保持して再挑戦可能
- セーブ形式、配合、能力値、モンスターIDは変更なし

---

v8.6-A.3 追加既存IDモンスターアート反映

GAME_VERSIONを8.6-A.3へ更新

主な変更:
- 水・氷・深海系の `frostpup`, `snowfairy`, `snowcat`, `shellgolem` を実装用PNGへ反映
- 機械系の `gearcat`, `steelbug`, `ironmantis`, `thunderdrone`, `forgegolem`, `skywarden`, `arkmachine` を実装用PNGへ反映
- 旧画像を `assets/images/monsters/legacy/v8.6-A.2-before-additional-art/` へ退避
- セーブ形式、配合、能力値、モンスターIDは変更なし

---

v8.6-A.2 既存IDモンスターアート反映

GAME_VERSIONを8.6-A.2へ更新

主な変更:
- ぷる系、自然系、水・湿地・深海系の既存IDモンスターアートを実装用PNGへ差し替え
- `gearslime` の表示名を「ギアぷるミン」へ変更
- `mossking` の表示名を「コケヌシ」へ変更
- 旧画像を `assets/images/monsters/legacy/v8.6-A.1-before-existing-id-art/` へ退避
- セーブ形式、配合、能力値、モンスターIDは変更なし

---

# 現在の安定版

```text
v8.6-A.1 全画面UI可読性改善
```

## 今回の目的

```text
全画面を監査し、ゲーム内容を変えずに現在地、文字、操作状態を読みやすくする。
```

## 今回の変更

```text
GAME_VERSIONを8.6-A.1へ更新
上部バーへ現在の画面名を追加
下部ナビへaria-currentと操作ラベルを追加
キーボード操作時のフォーカスリングを追加
主要画面の6〜9px文字を11px前後まで拡大
戦闘コマンド、仲間カード、図鑑ルート、任務、マップを重点調整
セーブ形式番号は変更なし
```

## 次の候補

```text
採用済み10体を除く74体のキャラクターアート再設計
序盤8体から確認用イラストを制作
v8.6.1 ワールドマップの地域イベント追加
```

詳細:

```text
docs/UI_AUDIT_V86A1.md
docs/SKY_RUINS_BALANCE_V852.md
docs/WORLD_MAP_V851.md
docs/SKY_RUINS_V85.md
docs/QUEST_FUSION_GOALS_V842.md
docs/FUSION_GOALS_V832.md
docs/AUTO_BATTLE_V841.md
docs/BATTLE_TEMPO_SOUND_V84.md
docs/PROJECT_SPEC_CHATGPT.md
docs/CHATGPT_HANDOFF_PROMPT.md
docs/CHATGPT_WORKFLOW.md
```
