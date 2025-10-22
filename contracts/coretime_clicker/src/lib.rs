#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod coretime_clicker {
    use ink::storage::Mapping;
    #[cfg(feature = "std")]
    use ink::storage::traits::StorageLayout;

    use scale::{Decode, Encode};
    use scale_info::TypeInfo;

    pub type Result<T> = core::result::Result<T, ContractError>;

    const BASE_RATE: u128 = 10;
    const BOOM_CLAIMS: u8 = 5;
    const BOOM_CHANCE_DENOMINATOR: u64 = 100;
    const GOLDEN_RATIO_64: u64 = 0x9E37_79B9_7F4A_7C15;
    const RENT_COST: Balance = 1_000_000_000_000;

    #[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, Default)]
    #[cfg_attr(feature = "std", derive(TypeInfo, StorageLayout))]
    pub struct Player {
        pub cores_rented: u32,
        pub last_claim_block: u32,
        pub total_rewards: Balance,
        pub active_multiplier: u8,
        pub boom_claims_remaining: u8,
    }

    #[derive(Debug, Clone, Encode, Decode, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(TypeInfo))]
    pub struct PlayerStatus {
        pub cores_rented: u32,
        pub total_rewards: Balance,
        pub pending_reward: Balance,
        pub active_multiplier: u8,
        pub boom_claims_remaining: u8,
        pub last_claim_block: u32,
    }

    impl Default for PlayerStatus {
        fn default() -> Self {
            Self {
                cores_rented: 0,
                total_rewards: 0,
                pending_reward: 0,
                active_multiplier: 1,
                boom_claims_remaining: 0,
                last_claim_block: 0,
            }
        }
    }

    #[derive(Debug, Encode, Decode, TypeInfo, PartialEq, Eq)]
    pub enum ContractError {
        NoCoresRented,
        NothingToClaim,
        RewardOverflow,
        CoreOverflow,
        InsufficientBalance,
        TransferFailed,
    }

    #[ink(storage)]
    pub struct CoretimeClicker {
        player_stats: Mapping<AccountId, Player>,
        total_cores_rented: u64,
        jackpot_seed: u64,
        prepaid_balances: Mapping<AccountId, Balance>,
    }

    #[ink(event)]
    pub struct CoreRented {
        #[ink(topic)]
        player: AccountId,
        cores_rented: u32,
        block_number: u32,
        balance_remaining: Balance,
    }

    #[ink(event)]
    pub struct RewardClaimed {
        #[ink(topic)]
        player: AccountId,
        amount: Balance,
        multiplier: u8,
        block_number: u32,
    }

    #[ink(event)]
    pub struct ElasticBoom {
        #[ink(topic)]
        player: AccountId,
        bonus_amount: Balance,
        boosted_claims: u8,
    }

    #[ink(event)]
    pub struct BalanceDeposited {
        #[ink(topic)]
        player: AccountId,
        amount: Balance,
        new_balance: Balance,
    }

    #[ink(event)]
    pub struct BalanceWithdrawn {
        #[ink(topic)]
        player: AccountId,
        amount: Balance,
        new_balance: Balance,
    }

    impl CoretimeClicker {
        #[ink(constructor)]
        pub fn new() -> Self {
            let block_seed = Self::env().block_number() as u64;
            Self {
                player_stats: Default::default(),
                total_cores_rented: 0,
                jackpot_seed: block_seed ^ GOLDEN_RATIO_64,
                prepaid_balances: Default::default(),
            }
        }

        #[ink(message)]
        pub fn rent_core(&mut self) -> Result<()> {
            let caller = self.env().caller();
            let block_number = self.env().block_number();
            let mut player = self.player_stats.get(&caller).unwrap_or_default();

            let mut balance = self.prepaid_balances.get(&caller).unwrap_or(0);
            if balance < RENT_COST {
                return Err(ContractError::InsufficientBalance);
            }
            balance = balance
                .checked_sub(RENT_COST)
                .ok_or(ContractError::InsufficientBalance)?;
            self.prepaid_balances.insert(&caller, &balance);

            player.cores_rented = player
                .cores_rented
                .checked_add(1)
                .ok_or(ContractError::CoreOverflow)?;

            if player.last_claim_block == 0 {
                player.last_claim_block = block_number;
            }

            self.total_cores_rented = self
                .total_cores_rented
                .checked_add(1)
                .ok_or(ContractError::CoreOverflow)?;

            self.player_stats.insert(&caller, &player);

            self.env().emit_event(CoreRented {
                player: caller,
                cores_rented: player.cores_rented,
                block_number,
                balance_remaining: balance,
            });

            Ok(())
        }

        #[ink(message, payable)]
        pub fn deposit(&mut self) -> Result<Balance> {
            let caller = self.env().caller();
            let amount = self.env().transferred_value();

            let mut balance = self.prepaid_balances.get(&caller).unwrap_or(0);
            balance = balance
                .checked_add(amount)
                .ok_or(ContractError::RewardOverflow)?;
            self.prepaid_balances.insert(&caller, &balance);

            self.env().emit_event(BalanceDeposited {
                player: caller,
                amount,
                new_balance: balance,
            });

            Ok(balance)
        }

        #[ink(message)]
        pub fn withdraw(&mut self, amount: Balance) -> Result<Balance> {
            let caller = self.env().caller();
            let mut balance = self.prepaid_balances.get(&caller).unwrap_or(0);
            if balance < amount {
                return Err(ContractError::InsufficientBalance);
            }

            balance = balance
                .checked_sub(amount)
                .ok_or(ContractError::InsufficientBalance)?;
            self.prepaid_balances.insert(&caller, &balance);

            self.env().emit_event(BalanceWithdrawn {
                player: caller,
                amount,
                new_balance: balance,
            });

            if amount > 0 {
                self
                    .env()
                    .transfer(caller, amount)
                    .map_err(|_| ContractError::TransferFailed)?;
            }

            Ok(balance)
        }

        #[ink(message)]
        pub fn claim_reward(&mut self) -> Result<Balance> {
            let caller = self.env().caller();
            let block_number = self.env().block_number();
            let mut player = self.player_stats.get(&caller).unwrap_or_default();

            if player.cores_rented == 0 {
                return Err(ContractError::NoCoresRented);
            }

            if block_number <= player.last_claim_block {
                return Err(ContractError::NothingToClaim);
            }

            let elapsed_blocks = block_number - player.last_claim_block;
            let base_reward = Self::calculate_reward(player.cores_rented, elapsed_blocks);

            let reward_multiplier = if player.active_multiplier > 1 {
                player.active_multiplier as u128
            } else {
                1
            };

            let reward = base_reward
                .checked_mul(reward_multiplier)
                .ok_or(ContractError::RewardOverflow)?;

            player.total_rewards = player
                .total_rewards
                .checked_add(reward)
                .ok_or(ContractError::RewardOverflow)?;

            player.last_claim_block = block_number;

            if player.boom_claims_remaining > 0 {
                player.boom_claims_remaining -= 1;
                if player.boom_claims_remaining == 0 {
                    player.active_multiplier = 1;
                }
            }

            let triggered_boom = self.maybe_trigger_boom(&mut player);

            self.player_stats.insert(&caller, &player);

            self.env().emit_event(RewardClaimed {
                player: caller,
                amount: reward,
                multiplier: reward_multiplier as u8,
                block_number,
            });

            if let Some(boosted_claims) = triggered_boom {
                self.env().emit_event(ElasticBoom {
                    player: caller,
                    bonus_amount: 0,
                    boosted_claims,
                });
            }

            Ok(reward)
        }

        #[ink(message)]
        pub fn check_status(&self, account: AccountId) -> PlayerStatus {
            let mut player = self.player_stats.get(&account).unwrap_or_default();
            let current_block = self.env().block_number();

            let pending_reward = if player.cores_rented == 0
                || current_block <= player.last_claim_block
            {
                0
            } else {
                let elapsed_blocks = current_block - player.last_claim_block;
                let base_reward = Self::calculate_reward(player.cores_rented, elapsed_blocks);
                let multiplier = if player.active_multiplier > 1 {
                    player.active_multiplier as u128
                } else {
                    1
                };
                base_reward.saturating_mul(multiplier)
            };

            PlayerStatus {
                cores_rented: player.cores_rented,
                total_rewards: player.total_rewards,
                pending_reward,
                active_multiplier: player.active_multiplier,
                boom_claims_remaining: player.boom_claims_remaining,
                last_claim_block: player.last_claim_block,
            }
        }

        #[ink(message)]
        pub fn total_cores_rented(&self) -> u64 {
            self.total_cores_rented
        }

        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> Balance {
            self.prepaid_balances.get(&account).unwrap_or(0)
        }

        fn calculate_reward(cores: u32, elapsed_blocks: u32) -> Balance {
            (cores as u128)
                .saturating_mul(elapsed_blocks as u128)
                .saturating_mul(BASE_RATE)
        }

        fn maybe_trigger_boom(&mut self, player: &mut Player) -> Option<u8> {
            let roll = self.next_random();
            if roll % BOOM_CHANCE_DENOMINATOR == 0 {
                player.active_multiplier = 2;
                player.boom_claims_remaining = BOOM_CLAIMS;
                Some(BOOM_CLAIMS)
            } else {
                None
            }
        }

        fn next_random(&mut self) -> u64 {
            let block_number = self.env().block_number() as u64;
            let new_seed = self
                .jackpot_seed
                .wrapping_add(block_number)
                .wrapping_add(GOLDEN_RATIO_64);
            self.jackpot_seed = new_seed;
            new_seed
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env;

        fn advance_blocks(count: u32) {
            for _ in 0..count {
                ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            }
        }

        fn default_accounts(
        ) -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn deposit_for(contract: &mut CoretimeClicker, amount: Balance) {
            let accounts = default_accounts();
            let contract_id = ink::env::account_id::<ink::env::DefaultEnvironment>();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                accounts.alice,
                amount.saturating_mul(10),
            );
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                contract_id,
                amount.saturating_mul(10),
            );
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(amount);
            contract.deposit().expect("deposit should succeed");
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
        }

        #[ink::test]
        fn rent_core_increments_total() {
            let mut contract = CoretimeClicker::new();
            assert_eq!(contract.total_cores_rented(), 0);
            deposit_for(&mut contract, RENT_COST);

            contract.rent_core().expect("rent_core should succeed");

            assert_eq!(contract.total_cores_rented(), 1);

            let caller = default_accounts().alice;
            let status = contract.check_status(caller);
            assert_eq!(status.cores_rented, 1);
            assert_eq!(status.last_claim_block, 0);
        }

        #[ink::test]
        fn claim_reward_accumulates_balance() {
            let mut contract = CoretimeClicker::new();
            deposit_for(&mut contract, RENT_COST);
            contract.rent_core().expect("rent_core should succeed");

            advance_blocks(10);

            let reward = contract
                .claim_reward()
                .expect("claim_reward should succeed");

            assert_eq!(reward, BASE_RATE * 10);

            let caller = default_accounts().alice;
            let status = contract.check_status(caller);
            assert_eq!(status.total_rewards, BASE_RATE * 10);
        }

        #[ink::test]
        fn boom_sets_multiplier_and_decrements() {
            let mut contract = CoretimeClicker::new();
            deposit_for(&mut contract, RENT_COST);
            contract.rent_core().expect("rent_core should succeed");
            advance_blocks(5);

            // Force boom by adjusting seed to produce modulus 0.
            contract.jackpot_seed = 10;
            contract
                .claim_reward()
                .expect("claim_reward should succeed");

            let caller = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice;
            let status = contract.check_status(caller);
            assert_eq!(status.active_multiplier, 2);
            assert_eq!(status.boom_claims_remaining, BOOM_CLAIMS);
        }

        #[ink::test]
        fn claiming_without_elapsed_blocks_fails() {
            let mut contract = CoretimeClicker::new();
            deposit_for(&mut contract, RENT_COST);
            contract.rent_core().expect("rent_core should succeed");

            let err = contract.claim_reward().expect_err("should fail without elapsed blocks");
            assert_eq!(err, ContractError::NothingToClaim);
        }

        #[ink::test]
        fn cannot_rent_without_prepaid_balance() {
            let mut contract = CoretimeClicker::new();
            let err = contract.rent_core().expect_err("should require prepaid balance");
            assert_eq!(err, ContractError::InsufficientBalance);
        }

        #[ink::test]
        fn deposit_and_withdraw_balance() {
            let mut contract = CoretimeClicker::new();
            deposit_for(&mut contract, RENT_COST * 2);

            let caller = default_accounts().alice;
            assert_eq!(contract.balance_of(caller), RENT_COST * 2);

            // Rent consumes one cost
            contract.rent_core().expect("rent_core should succeed");
            assert_eq!(contract.balance_of(caller), RENT_COST);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
            contract
                .withdraw(RENT_COST)
                .expect("withdraw should succeed");
            assert_eq!(contract.balance_of(caller), 0);
        }
    }
}
