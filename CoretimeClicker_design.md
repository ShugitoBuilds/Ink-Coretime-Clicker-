# 🎮 Coretime Clicker — Gameplay & Smart-Contract Design Document

## 🌐 Overview

Coretime Clicker is a single-player, on-chain clicker/idle game that runs entirely on **Polkadot ink!**. Players “rent” temporary compute cores, wait for their rental cycle to finish, and **claim rewards** that scale with usage time and occasional jackpot events (“Elastic Booms”). The goal is to **teach Polkadot 2.0 / JAM concepts** — Coretime rental, Elastic Scaling, and on-chain economics — while keeping the loop simple and addictive.

---

## ⚙️ Core Gameplay Loop

1. **Player connects wallet** → creates or loads their on-chain game state.
2. **Click “Rent Core”** → contract records a core rental for this player.
3. **Coretime progress** → each rental matures after N blocks.
4. **Click “Claim Reward”** → contract checks elapsed blocks → issues DOT-like token reward.
5. **Elastic Boom** (≈ 1 % chance per claim) → doubles next N rewards or instantly adds bonus tokens.
6. Repeat → build streaks, climb leaderboard.

---

## 🧠 Key Concepts Taught

| Game Action      | Polkadot Concept                    | Lesson                                        |
| ---------------- | ----------------------------------- | --------------------------------------------- |
| Renting cores    | Coretime allocation                 | Compute power is rented, not owned            |
| Waiting blocks   | Block finality & epoch timing       | Time on Polkadot is measured in blocks        |
| Jackpot event    | Elastic Scaling                     | The network can spawn extra cores dynamically |
| Claiming rewards | Collator rewards / block production | Work → rewards                                |
| Leaderboard      | Shared security                     | Many players = stronger network               |

---

## 🧩 Smart-Contract Model (ink!)

**Storage Struct**

```rust
struct CoretimeClicker {
    player_stats: Mapping<AccountId, Player>,
    total_cores_rented: u64,
    jackpot_seed: u64
}

struct Player {
    cores_rented: u32,
    last_claim_block: u32,
    total_rewards: Balance,
    active_multiplier: u8,  // 1 or 2 during Elastic Boom
}
```

**Public Messages**

| Function         | Purpose                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `rent_core()`    | Registers a new rental (increments cores_rented). Costs small fee.                         |
| `claim_reward()` | Calculates pending reward based on elapsed blocks and multiplier; resets last_claim_block. |
| `check_status()` | Returns player’s core count, multiplier, pending rewards.                                  |
| `trigger_boom()` | Internal randomness call (block hash mod odds) → sets multiplier = 2 for next 5 claims.    |

**Events**

* `CoreRented(player, block_number)`
* `RewardClaimed(player, amount, multiplier)`
* `ElasticBoom(player, bonus_amount)`

---

## 🖥️ Frontend Flow (Vite + Tailwind + Polkadot.js API)

**UI Layout**

* Top bar: wallet address + balance
* Main button: “Rent Core 🚀”
* Progress bar: shows core rental timer (blocks remaining)
* Claim button: “Collect Rewards”
* Animated Elastic Boom overlay when triggered
* Leaderboard panel (read-only contract query)

**Frontend Logic**

* Connect wallet (`polkadot.js extension`)
* On click → `contract.tx.rent_core()`
* Listen for `RewardClaimed` & `ElasticBoom` events
* Update UI state locally
* Optional: store scores in off-chain JSON for ranking

---

## 💰 Reward Formula (Balance Units)

```
reward = base_rate * cores_rented * elapsed_blocks
if ElasticBoom → reward *= 2
```

* `base_rate` ≈ 10 units/block (tweak later).
* Chance of ElasticBoom ≈ 1 % per claim.

---

## 🎨 Style Guidelines

* Colors: Polkadot pink + dark background (#1B1B1F).
* Fonts: Inter / JetBrains Mono for tech feel.
* Visual theme: neon nodes lighting up as cores spin.
* Sound (optional): “Ping” when claiming reward; “Boom” when jackpot triggers.

---

## 🚀 MVP Goal

* One button loop (rent → wait → claim).
* Smart contract state persists per account.
* Random ElasticBoom event.
* Frontend feedback + leaderboard (optional).
* Deploy on Shibuya testnet (Astar) or Moonbase Alpha for demo.

---
