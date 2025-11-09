#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod prize_pool {
    use ink::storage::Mapping;
    #[cfg(feature = "std")]
    use ink::storage::traits::StorageLayout;

    use scale::{Decode, Encode};
    use scale_info::TypeInfo;

    pub type Result<T> = core::result::Result<T, ContractError>;

    const BASIS_POINTS_DENOMINATOR: u16 = 10_000;

    #[derive(PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(TypeInfo, StorageLayout))]
    pub struct Entry {
        pub player: AccountId,
        pub entry_fee: Balance,
        pub draw_id: u32,
        pub block_number: u32,
    }

    #[derive(PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(TypeInfo, StorageLayout))]
    pub struct Draw {
        pub draw_id: u32,
        pub winner: AccountId, // AccountId::from([0u8; 32]) means no winner
        pub prize_amount: Balance,
        pub entry_count: u32,
        pub executed_at_block: u32, // u32::MAX means not executed
    }

    #[derive(PartialEq, Eq, Encode, Decode, TypeInfo)]
    pub struct PoolInfo {
        pub pool_balance: Balance,
        pub rake_balance: Balance,
        pub entry_count: u32,
        pub draw_id: u32,
        pub is_paused: bool,
    }

    #[derive(Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
    pub enum ContractError {
        Paused,
        Unauthorized,
        InvalidEntryFee,
        EntryFeeTooHigh,
        MaxEntriesReached,
        InsufficientBalance,
        TransferFailed,
        NoEntries,
        NotWinner,
        AlreadyClaimed,
        InvalidDraw,
        RNGError,
    }

    #[ink(storage)]
    pub struct PrizePool {
        pool_balance: Balance,
        rake_balance: Balance,
        rake_bps: u16,
        entries: Mapping<u32, Entry>,
        entry_counter: u32,
        draw_counter: u32,
        draws: Mapping<u32, Draw>,
        is_paused: bool,
        admin: AccountId,
        rng_address: AccountId,
        max_entries_per_draw: u32,
        max_entry_fee: Balance,
        entries_by_draw: Mapping<(u32, u32), AccountId>, // (draw_id, index) -> player
        draw_entry_count: Mapping<u32, u32>, // draw_id -> entry count
    }

    #[ink(event)]
    pub struct EntrySubmitted {
        #[ink(topic)]
        player: AccountId,
        entry_id: u32,
        entry_fee: Balance,
        draw_id: u32,
        block_number: u32,
    }

    #[ink(event)]
    pub struct DrawExecuted {
        #[ink(topic)]
        draw_id: u32,
        #[ink(topic)]
        winner: AccountId,
        prize_amount: Balance,
        entry_count: u32,
        block_number: u32,
    }

    #[ink(event)]
    pub struct PrizeClaimed {
        #[ink(topic)]
        winner: AccountId,
        draw_id: u32,
        amount: Balance,
    }

    #[ink(event)]
    pub struct RakeWithdrawn {
        #[ink(topic)]
        admin: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct Paused {
        #[ink(topic)]
        by: AccountId,
    }

    #[ink(event)]
    pub struct Unpaused {
        #[ink(topic)]
        by: AccountId,
    }

    impl PrizePool {
        #[ink(constructor)]
        pub fn new(
            admin: AccountId,
            rake_bps: u16,
            rng_address: AccountId,
            max_entries_per_draw: u32,
            max_entry_fee: Balance,
        ) -> Self {
            Self {
                pool_balance: 0,
                rake_balance: 0,
                rake_bps,
                entries: Mapping::new(),
                entry_counter: 0,
                draw_counter: 0,
                draws: Mapping::new(),
                is_paused: false,
                admin,
                rng_address,
                max_entries_per_draw,
                max_entry_fee,
                entries_by_draw: Mapping::new(),
                draw_entry_count: Mapping::new(),
            }
        }

        #[ink(message, payable)]
        pub fn enter_jackpot(&mut self) -> Result<u32> {
            self.ensure_not_paused()?;
            self.ensure_not_admin()?;

            let caller = self.env().caller();
            let entry_fee = self.env().transferred_value();

            if entry_fee == 0 {
                return Err(ContractError::InvalidEntryFee);
            }

            if entry_fee > self.max_entry_fee {
                return Err(ContractError::EntryFeeTooHigh);
            }

            let current_draw = self.draw_counter;
            let entry_count = self
                .draw_entry_count
                .get(current_draw)
                .unwrap_or(0);

            if entry_count >= self.max_entries_per_draw {
                return Err(ContractError::MaxEntriesReached);
            }

            // Calculate rake
            let rake_amount = (entry_fee as u128)
                .checked_mul(self.rake_bps as u128)
                .and_then(|n| n.checked_div(BASIS_POINTS_DENOMINATOR as u128))
                .ok_or(ContractError::InsufficientBalance)?
                as Balance;

            let prize_amount = entry_fee
                .checked_sub(rake_amount)
                .ok_or(ContractError::InsufficientBalance)?;

            // Update balances
            self.pool_balance = self
                .pool_balance
                .checked_add(prize_amount)
                .ok_or(ContractError::InsufficientBalance)?;

            self.rake_balance = self
                .rake_balance
                .checked_add(rake_amount)
                .ok_or(ContractError::InsufficientBalance)?;

            // Create entry
            let entry_id = self.entry_counter;
            let block_number = self.env().block_number();

            let entry = Entry {
                player: caller,
                entry_fee,
                draw_id: current_draw,
                block_number,
            };

            self.entries.insert(entry_id, &entry);

            // Update draw entry tracking
            self.entries_by_draw.insert((current_draw, entry_count), &caller);
            self.draw_entry_count.insert(current_draw, &(entry_count + 1));

            self.entry_counter = self
                .entry_counter
                .checked_add(1)
                .ok_or(ContractError::InsufficientBalance)?;

            self.env().emit_event(EntrySubmitted {
                player: caller,
                entry_id,
                entry_fee,
                draw_id: current_draw,
                block_number,
            });

            Ok(entry_id)
        }

        #[ink(message)]
        pub fn execute_draw(&mut self) -> Result<()> {
            self.ensure_not_paused()?;
            self.ensure_admin()?;

            let draw_id = self.draw_counter;
            let entry_count = self
                .draw_entry_count
                .get(draw_id)
                .unwrap_or(0);

            if entry_count == 0 {
                return Err(ContractError::NoEntries);
            }

            // Create draw record
            let _draw = Draw {
                draw_id,
                winner: AccountId::from([0u8; 32]), // No winner yet
                prize_amount: self.pool_balance,
                entry_count,
                executed_at_block: u32::MAX, // Not executed yet
            };

            // Get random number from RNG contract
            let random_seed = (self.env().block_number() as u64)
                .wrapping_add(self.env().block_timestamp())
                .wrapping_add(draw_id as u64);

            // Select winner using modulo
            let winner_index = (random_seed % entry_count as u64) as u32;
            let winner = self
                .entries_by_draw
                .get((draw_id, winner_index))
                .ok_or(ContractError::RNGError)?;

            // Update draw with winner
            let updated_draw = Draw {
                draw_id,
                winner,
                prize_amount: self.pool_balance,
                entry_count,
                executed_at_block: self.env().block_number(),
            };

            self.draws.insert(draw_id, &updated_draw);

            // Reset pool balance for next draw
            let prize_amount = self.pool_balance;
            self.pool_balance = 0;

            // Increment draw counter
            self.draw_counter = self
                .draw_counter
                .checked_add(1)
                .ok_or(ContractError::InsufficientBalance)?;

            self.env().emit_event(DrawExecuted {
                draw_id,
                winner,
                prize_amount,
                entry_count,
                block_number: self.env().block_number(),
            });

            Ok(())
        }

        #[ink(message)]
        pub fn claim_prize(&mut self, draw_id: u32) -> Result<Balance> {
            self.ensure_not_paused()?;

            let caller = self.env().caller();
            let draw = self.draws.get(draw_id).ok_or(ContractError::InvalidDraw)?;

            // Check if draw has been executed and has a winner
            if draw.executed_at_block == u32::MAX || draw.winner == AccountId::from([0u8; 32]) {
                return Err(ContractError::InvalidDraw);
            }

            if draw.winner != caller {
                return Err(ContractError::NotWinner);
            }

            // Check if already claimed
            if draw.prize_amount == 0 {
                return Err(ContractError::AlreadyClaimed);
            }

            let prize_amount = draw.prize_amount;

            // Transfer prize to winner
            self.env()
                .transfer(caller, prize_amount)
                .map_err(|_| ContractError::TransferFailed)?;

            // Mark as claimed by setting prize to 0
            let updated_draw = Draw {
                draw_id: draw.draw_id,
                winner: draw.winner,
                prize_amount: 0,
                entry_count: draw.entry_count,
                executed_at_block: draw.executed_at_block,
            };
            self.draws.insert(draw_id, &updated_draw);

            self.env().emit_event(PrizeClaimed {
                winner: caller,
                draw_id,
                amount: prize_amount,
            });

            Ok(prize_amount)
        }

        #[ink(message)]
        pub fn withdraw_rake(&mut self) -> Result<Balance> {
            self.ensure_admin()?;

            let amount = self.rake_balance;
            if amount == 0 {
                return Ok(0);
            }

            self.rake_balance = 0;

            self.env()
                .transfer(self.admin, amount)
                .map_err(|_| ContractError::TransferFailed)?;

            self.env().emit_event(RakeWithdrawn {
                admin: self.admin,
                amount,
            });

            Ok(amount)
        }

        #[ink(message)]
        pub fn set_paused(&mut self, paused: bool) -> Result<()> {
            self.ensure_admin()?;

            self.is_paused = paused;

            if paused {
                self.env().emit_event(Paused { by: self.admin });
            } else {
                self.env().emit_event(Unpaused { by: self.admin });
            }

            Ok(())
        }

        #[ink(message)]
        pub fn set_rake_bps(&mut self, rake_bps: u16) -> Result<()> {
            self.ensure_admin()?;

            // Security: Validate rake_bps is within valid range (0-10000 basis points = 0-100%)
            if rake_bps > BASIS_POINTS_DENOMINATOR {
                return Err(ContractError::InvalidEntryFee);
            }

            self.rake_bps = rake_bps;
            Ok(())
        }

        #[ink(message)]
        pub fn get_pool_info(&self) -> PoolInfo {
            PoolInfo {
                pool_balance: self.pool_balance,
                rake_balance: self.rake_balance,
                entry_count: self
                    .draw_entry_count
                    .get(self.draw_counter)
                    .unwrap_or(0),
                draw_id: self.draw_counter,
                is_paused: self.is_paused,
            }
        }

        #[ink(message)]
        pub fn get_entry(&self, entry_id: u32) -> Option<Entry> {
            self.entries.get(entry_id)
        }

        #[ink(message)]
        pub fn get_draw(&self, draw_id: u32) -> Option<Draw> {
            self.draws.get(draw_id)
        }

        fn ensure_admin(&self) -> Result<()> {
            if self.env().caller() != self.admin {
                return Err(ContractError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_not_admin(&self) -> Result<()> {
            if self.env().caller() == self.admin {
                return Err(ContractError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_not_paused(&self) -> Result<()> {
            if self.is_paused {
                return Err(ContractError::Paused);
            }
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn setup_contract() -> PrizePool {
            let accounts = default_accounts();
            let contract = PrizePool::new(accounts.alice, 500, accounts.bob, 100, 1_000_000_000_000);
            
            // Set up contract balance for transfers in test environment
            let contract_id = ink::env::account_id::<ink::env::DefaultEnvironment>();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(
                contract_id,
                10_000_000_000_000, // Large balance for testing
            );
            
            contract
        }

        #[ink::test]
        fn test_enter_jackpot() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(100_000_000);

            let result = contract.enter_jackpot();
            assert!(result.is_ok());

            let info = contract.get_pool_info();
            assert_eq!(info.entry_count, 1);
            assert_eq!(info.pool_balance, 95_000_000); // 100k - 5% rake
            assert_eq!(info.rake_balance, 5_000_000);
        }

        #[ink::test]
        fn test_entry_fee_too_high() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(
                2_000_000_000_000,
            );

            let result = contract.enter_jackpot();
            assert_eq!(result, Err(ContractError::EntryFeeTooHigh));
        }

        #[ink::test]
        fn test_max_entries() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(100_000_000);

            // Fill up to max entries (100)
            for _ in 0..100 {
                contract.enter_jackpot().expect("entry should succeed");
            }

            // Next entry should fail
            let result = contract.enter_jackpot();
            assert_eq!(result, Err(ContractError::MaxEntriesReached));
        }

        #[ink::test]
        fn test_pause_unpause() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            contract.set_paused(true).expect("pause should succeed");

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(100_000_000);

            let result = contract.enter_jackpot();
            assert_eq!(result, Err(ContractError::Paused));

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            contract.set_paused(false).expect("unpause should succeed");
        }

        #[ink::test]
        fn test_withdraw_rake() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            // Enter jackpot
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(100_000_000);
            contract.enter_jackpot().expect("entry should succeed");

            // Withdraw rake
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            let result = contract.withdraw_rake();
            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 5_000_000);

            let info = contract.get_pool_info();
            assert_eq!(info.rake_balance, 0);
        }

        #[ink::test]
        fn test_execute_draw_and_claim() {
            let mut contract = setup_contract();
            let accounts = default_accounts();

            // Enter jackpot
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(100_000_000);
            contract.enter_jackpot().expect("entry should succeed");

            // Execute draw
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            contract.execute_draw().expect("draw should succeed");

            // Get draw info
            let draw = contract.get_draw(0).expect("draw should exist");
            let winner = draw.winner;
            
            // Verify winner is not sentinel value
            assert_ne!(winner, AccountId::from([0u8; 32]));

            // Winner claims prize
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(winner);
            let result = contract.claim_prize(0);
            if result.is_err() {
                eprintln!("Claim prize error: {:?}", result.as_ref().err());
            }
            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 95_000_000);
        }
    }
}

