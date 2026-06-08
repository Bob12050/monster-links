v8.6-A.3 モンスターカード表示改善

GAME_VERSIONを8.6-A.3へ更新

主な変更:
- モンスターカード、牧場カード、図鑑カードのアート表示を強化
- モンスター詳細モーダルのアート枠、背景、余白を調整
- ランク・属性・サイズ表示の視認性を改善
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
