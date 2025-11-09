#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod rng {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    #[cfg(feature = "std")]
    use ink::storage::traits::StorageLayout;

    use scale::{Decode, Encode};
    use scale_info::TypeInfo;

    pub type Result<T> = core::result::Result<T, ContractError>;

    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(TypeInfo, StorageLayout))]
    pub struct Commitment {
        pub committer: AccountId,
        pub commit_hash: [u8; 32],
        pub reveal_block: u32,
        pub committed_at_block: u32,
        pub revealed: bool,
        pub random_number: u64, // 0 means not revealed
    }

    #[derive(Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
    pub enum ContractError {
        InvalidCommitment,
        RevealTooEarly,
        AlreadyRevealed,
        InvalidSecret,
        CommitmentNotFound,
    }

    #[ink(storage)]
    pub struct RNG {
        commitments: Mapping<u32, Commitment>,
        commitment_counter: u32,
        min_reveal_blocks: u32,
    }

    #[ink(event)]
    pub struct Committed {
        #[ink(topic)]
        committer: AccountId,
        commitment_id: u32,
        commit_hash: [u8; 32],
        reveal_block: u32,
        committed_at_block: u32,
    }

    #[ink(event)]
    pub struct Revealed {
        #[ink(topic)]
        committer: AccountId,
        commitment_id: u32,
        random_number: u64,
        revealed_at_block: u32,
    }

    impl RNG {
        #[ink(constructor)]
        pub fn new(min_reveal_blocks: u32) -> Self {
            Self {
                commitments: Mapping::new(),
                commitment_counter: 0,
                min_reveal_blocks,
            }
        }

        #[ink(message)]
        pub fn commit(&mut self, commit_hash: [u8; 32], reveal_block: u32) -> Result<u32> {
            let caller = self.env().caller();
            let current_block = self.env().block_number();

            // Ensure reveal_block is at least min_reveal_blocks in the future
            if reveal_block < current_block.saturating_add(self.min_reveal_blocks) {
                return Err(ContractError::InvalidCommitment);
            }

            let commitment_id = self.commitment_counter;
            self.commitment_counter = self
                .commitment_counter
                .checked_add(1)
                .ok_or(ContractError::InvalidCommitment)?;

            let commitment = Commitment {
                committer: caller,
                commit_hash,
                reveal_block,
                committed_at_block: current_block,
                revealed: false,
                random_number: 0, // Not revealed yet
            };

            self.commitments.insert(commitment_id, &commitment);

            self.env().emit_event(Committed {
                committer: caller,
                commitment_id,
                commit_hash,
                reveal_block,
                committed_at_block: current_block,
            });

            Ok(commitment_id)
        }

        #[ink(message)]
        pub fn reveal(&mut self, commitment_id: u32, secret: Vec<u8>) -> Result<u64> {
            let caller = self.env().caller();
            let current_block = self.env().block_number();

            let mut commitment = self
                .commitments
                .get(commitment_id)
                .ok_or(ContractError::CommitmentNotFound)?;

            if commitment.committer != caller {
                return Err(ContractError::InvalidSecret);
            }

            if commitment.revealed {
                return Err(ContractError::AlreadyRevealed);
            }

            if current_block < commitment.reveal_block {
                return Err(ContractError::RevealTooEarly);
            }

            // Verify secret matches commitment hash
            let computed_hash = self.hash_secret(&secret);
            if computed_hash != commitment.commit_hash {
                return Err(ContractError::InvalidSecret);
            }

            // Generate random number from secret + block data
            let random_number = self.generate_random_number(&secret, current_block);
            
            // Ensure random_number is never 0 (sentinel value)
            let random_number = if random_number == 0 { 1 } else { random_number };

            commitment.revealed = true;
            commitment.random_number = random_number;
            self.commitments.insert(commitment_id, &commitment);

            self.env().emit_event(Revealed {
                committer: caller,
                commitment_id,
                random_number,
                revealed_at_block: current_block,
            });

            Ok(random_number)
        }

        #[ink(message)]
        pub fn get_random_number(&self, commitment_id: u32) -> Option<u64> {
            self.commitments
                .get(commitment_id)
                .and_then(|c| if c.revealed && c.random_number != 0 {
                    Some(c.random_number)
                } else {
                    None
                })
        }

        #[ink(message)]
        pub fn get_commitment(&self, commitment_id: u32) -> Option<Commitment> {
            self.commitments.get(commitment_id)
        }

        fn hash_secret(&self, input: &[u8]) -> [u8; 32] {
            // Deterministic hash implementation for MVP
            // Simple XOR-based hash
            let mut output = [0u8; 32];
            for (i, byte) in input.iter().enumerate() {
                output[i % 32] ^= *byte;
            }
            output
        }

        fn generate_random_number(&self, secret: &[u8], block_number: u32) -> u64 {
            // Combine secret with block data for randomness
            // Use fixed-size array instead of Vec
            let mut combined = [0u8; 64];
            let secret_len = secret.len().min(32);
            combined[..secret_len].copy_from_slice(&secret[..secret_len]);
            combined[32..36].copy_from_slice(&block_number.to_le_bytes());
            combined[36..44].copy_from_slice(&self.env().block_timestamp().to_le_bytes());

            // Simple hash to generate random number
            let mut hash_bytes = [0u8; 8];
            for (i, byte) in combined.iter().enumerate() {
                hash_bytes[i % 8] ^= *byte;
            }
            
            // Mix with block number
            let block_bytes = block_number.to_le_bytes();
            for (i, byte) in block_bytes.iter().enumerate() {
                hash_bytes[i] ^= byte.wrapping_mul(17);
            }
            
            u64::from_le_bytes(hash_bytes)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn advance_blocks(count: u32) {
            for _ in 0..count {
                ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            }
        }

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn test_commit_reveal_flow() {
            let mut contract = RNG::new(10);
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            // Tests start at block 0, so reveal at block 10 (min_reveal_blocks = 10)
            let reveal_block = 10;

            let secret = b"test_secret".to_vec();
            let commit_hash = contract.hash_secret(&secret);

            let commitment_id = contract.commit(commit_hash, reveal_block).expect("commit should succeed");

            // Advance blocks to reach reveal block (from 0 to 10)
            advance_blocks(10);

            let result = contract.reveal(commitment_id, secret.clone());
            assert!(result.is_ok());

            let random_number = result.unwrap();
            assert!(random_number > 0);

            let stored = contract.get_random_number(commitment_id);
            assert_eq!(stored, Some(random_number));
        }

        #[ink::test]
        fn test_reveal_too_early() {
            let mut contract = RNG::new(10);
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            // Tests start at block 0, reveal at block 10
            let reveal_block = 10;

            let secret = b"test_secret".to_vec();
            let commit_hash = contract.hash_secret(&secret);
            let commitment_id = contract.commit(commit_hash, reveal_block).expect("commit should succeed");

            // Try to reveal too early (only advance 5 blocks, need 10)
            advance_blocks(5);
            let result = contract.reveal(commitment_id, secret);
            assert_eq!(result, Err(ContractError::RevealTooEarly));
        }

        #[ink::test]
        fn test_double_reveal() {
            let mut contract = RNG::new(10);
            let accounts = default_accounts();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            // Tests start at block 0, reveal at block 10
            let reveal_block = 10;

            let secret = b"test_secret".to_vec();
            let commit_hash = contract.hash_secret(&secret);
            let commitment_id = contract.commit(commit_hash, reveal_block).expect("commit should succeed");

            advance_blocks(10);
            contract.reveal(commitment_id, secret.clone()).expect("reveal should succeed");

            // Try to reveal again
            let result = contract.reveal(commitment_id, secret);
            assert_eq!(result, Err(ContractError::AlreadyRevealed));
        }
    }
}

