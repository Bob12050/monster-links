# v6.7 追加モンスター第1弾 実装メモ

## 実装方針

今回の20体はまだ正式実装せず、まずはデータ枠と画像方針だけを確定します。

## monsters.js追加時の仮コード

能力値はまだ0の仮置きです。
実装時に既存ランク基準に合わせて調整します。

```javascript
    dewplim:{name:"しずくぷる",rank:"F",type:"water",emoji:"❔",image:"assets/images/monsters/dewplim.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["splash", 2], ["heal", 6]]},
    budbunny:{name:"つぼみラビ",rank:"F",type:"nature",emoji:"❔",image:"assets/images/monsters/budbunny.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["needle", 2], ["heal", 7]]},
    cavemole:{name:"ドリモール",rank:"E",type:"stone",emoji:"❔",image:"assets/images/monsters/cavemole.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["crush", 3], ["bite", 6]]},
    sparkbug:{name:"スパークバグ",rank:"E",type:"light",emoji:"❔",image:"assets/images/monsters/sparkbug.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["spark", 2], ["thunder", 8]]},
    ashimp:{name:"アッシュインプ",rank:"E",type:"fire",emoji:"❔",image:"assets/images/monsters/ashimp.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["flame", 2], ["bite", 5]]},
    reefowl:{name:"リーファウル",rank:"D",type:"wing",emoji:"❔",image:"assets/images/monsters/reefowl.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["splash", 2], ["needle", 5], ["heal", 9]]},
    miretoad:{name:"ミアトード",rank:"D",type:"water",emoji:"❔",image:"assets/images/monsters/miretoad.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["splash", 1], ["toxic", 5], ["acid", 8]]},
    gearcat:{name:"ギアキャット",rank:"D",type:"machine",emoji:"❔",image:"assets/images/monsters/gearcat.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["spark", 2], ["laser", 8]]},
    snowfairy:{name:"スノーフェア",rank:"D",type:"water",emoji:"❔",image:"assets/images/monsters/snowfairy.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["blizzard", 1], ["heal", 4], ["megaheal", 10]]},
    cinderhorn:{name:"シンダーホーン",rank:"C",type:"fire",emoji:"❔",image:"assets/images/monsters/cinderhorn.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["flame", 1], ["crush", 5], ["inferno", 10]]},
    cragbear:{name:"クラッグベア",rank:"C",type:"stone",emoji:"❔",image:"assets/images/monsters/cragbear.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["crush", 1], ["quake", 8]]},
    lumenowl:{name:"ルーメンオウル",rank:"C",type:"light",emoji:"❔",image:"assets/images/monsters/lumenowl.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["spark", 1], ["starfall", 9], ["heal", 6]]},
    abyssjelly:{name:"アビスジェリー",rank:"C",type:"water",emoji:"❔",image:"assets/images/monsters/abyssjelly.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["splash", 1], ["abyss", 8], ["megaheal", 10]]},
    venomqueen:{name:"ヴェノムクイーン",rank:"B",type:"dark",emoji:"❔",image:"assets/images/monsters/venomqueen.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["toxic", 1], ["shadow", 5], ["acid", 9]]},
    thunderlion:{name:"サンダーライオン",rank:"B",type:"light",emoji:"❔",image:"assets/images/monsters/thunderlion.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["thunder", 1], ["bite", 4], ["overdrive", 10]]},
    forgegolem:{name:"フォージゴーレム",rank:"B",type:"machine",emoji:"❔",image:"assets/images/monsters/forgegolem.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["quake", 1], ["laser", 6], ["overdrive", 10]]},
    glacierfang:{name:"グレイシャーファング",rank:"A",type:"water",emoji:"❔",image:"assets/images/monsters/glacierfang.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["blizzard", 1], ["bite", 4], ["abyss", 10]]},
    solarwyrm:{name:"ソーラーウィルム",rank:"A",type:"light",emoji:"❔",image:"assets/images/monsters/solarwyrm.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["starfall", 1], ["holywave", 5], ["thunder", 9]]},
    nightmarestag:{name:"ナイトメアスタッグ",rank:"A",type:"dark",emoji:"❔",image:"assets/images/monsters/nightmarestag.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["shadow", 1], ["toxic", 5], ["chaosflare", 12]]},
    titanplim:{name:"タイタンぷる",rank:"S",type:"slime",emoji:"❔",image:"assets/images/monsters/titanplim.png",base:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},grow:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},skills:[["crush", 1], ["megaheal", 5], ["starfall", 10]]},
```

## 実装時に確認すること

```text
ID重複なし
画像パス重複なし
属性の偏り確認
ランクの偏り確認
スキルIDが存在するか確認
ステージ出現数が多すぎないか確認
配合レシピが重複しないか確認
```

## 画像ファイル名

```text
assets/images/monsters/<id>.png
```

## まだ入れないもの

```text
SSランク
3枠モンスター
4体配合
正式な2枠仕様
```

forgegolem と titanplim は将来2枠候補ですが、現時点ではメモ扱いです。
