(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};

  /*
    v3.2: バランス調整値
    ここはゲーム全体のテンポをまとめて調整する場所です。

    目安:
    - 序盤をサクサク進めたい → expMultiplier / scoutBonus を上げる
    - お金不足を減らしたい → goldMultiplier を上げる
    - アイテム収集を楽にしたい → dropRateMultiplier を上げる
    - 公開時にテスト機能を隠す → testMenuEnabled: false
  */
  P.BALANCE = {
    // 通常探索の報酬
    expMultiplier: 1.16,
    goldMultiplier: 1.12,

    // 闘技場の報酬。闘技場は周回報酬なので上げすぎ注意。
    arenaExpMultiplier: 1.04,
    arenaGoldMultiplier: 1.05,

    // スカウト・ドロップ・逃走の補正
    scoutBonus: 2,
    dropRateMultiplier: 1.18,
    bossDropRateBonus: 5,
    escapeBonus: 4,

    // v6.1 戦闘ダメージ調整
    // 敵味方どちらも一撃が重すぎたため、全体ダメージを少し抑えます。
    playerDamageMultiplier: 0.82,
    enemyDamageMultiplier: 0.82,
    normalAttackMultiplier: 0.88,
    skillDamageMultiplier: 0.96,
    weaknessMultiplierBonus: 0.08,
    guardMultiplier: 0.38,
    healMultiplier: 1.12,

    // 公開版では false 推奨
    testMenuEnabled: false
  };
})();
