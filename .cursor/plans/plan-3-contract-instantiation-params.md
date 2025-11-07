# Contract Instantiation Parameters

## PrizePool Contract

### Constructor Parameters

When instantiating the PrizePool contract, provide the following parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `owner` | `AccountId` | Admin account address (can pause/unpause, execute draws, withdraw rake) | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` |
| `rake_bps` | `u16` | Rake in basis points (100 = 1%, 500 = 5%, 1000 = 10%) | `500` (5%) |
| `rng_address` | `AccountId` | Address of the deployed RNG contract | `5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty` |
| `max_entries_per_draw` | `u32` | Maximum number of entries allowed per draw | `100` |
| `max_entry_fee` | `Balance` | Maximum entry fee in planck units (prevents excessive gas) | `1000000000000` (1 KSM with 12 decimals) |

### Example Instantiation

**Using cargo-contract:**
```bash
cargo contract instantiate \
  --constructor new \
  --args "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" \
  --args "500" \
  --args "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" \
  --args "100" \
  --args "1000000000000" \
  --suri //Alice \
  --execute
```

**Using Polkadot.js Apps UI:**
1. Navigate to Contracts → Instantiate
2. Upload `artifacts/prize_pool.contract`
3. Select `new` constructor
4. Fill in parameters:
   - `owner`: Your admin account address
   - `rake_bps`: `500` (or desired percentage × 100)
   - `rng_address`: Deployed RNG contract address
   - `max_entries_per_draw`: `100` (or desired limit)
   - `max_entry_fee`: `1000000000000` (or desired max fee)
5. Set endowment (for contract storage)
6. Submit and sign transaction

### Recommended Values

- **rake_bps**: `500` (5%) - Standard for gaming platforms
- **max_entries_per_draw**: `100` - Prevents gas issues with large draws
- **max_entry_fee**: `1000000000000` (1 KSM) - Prevents excessive entry fees

## RNG Contract

### Constructor Parameters

When instantiating the RNG contract, provide the following parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `min_reveal_blocks` | `u32` | Minimum blocks that must pass before reveal is allowed | `10` |

### Example Instantiation

**Using cargo-contract:**
```bash
cargo contract instantiate \
  --constructor new \
  --args "10" \
  --suri //Alice \
  --execute
```

**Using Polkadot.js Apps UI:**
1. Navigate to Contracts → Instantiate
2. Upload `artifacts/rng.contract`
3. Select `new` constructor
4. Fill in parameter:
   - `min_reveal_blocks`: `10` (or desired minimum blocks)
5. Set endowment (for contract storage)
6. Submit and sign transaction

### Recommended Values

- **min_reveal_blocks**: `10` - Provides reasonable security window while not delaying too long

## Deployment Order

1. **Deploy RNG contract first** - PrizePool depends on RNG address
2. **Record RNG contract address** - Needed for PrizePool instantiation
3. **Deploy PrizePool contract** - Use RNG address from step 2

## Gas Estimation

### RNG Contract
- Instantiation: ~2-3 KSM (for storage deposit)
- Commit: ~0.001 KSM
- Reveal: ~0.001 KSM

### PrizePool Contract
- Instantiation: ~3-5 KSM (for storage deposit)
- Enter Jackpot: ~0.002 KSM
- Execute Draw: ~0.005 KSM (depends on entry count)
- Claim Prize: ~0.001 KSM
- Withdraw Rake: ~0.001 KSM

*Note: Gas costs are estimates and may vary based on network conditions*

## Storage Deposit

Both contracts require a storage deposit (endowment) when instantiated. This is typically:
- **RNG Contract**: 2-3 KSM
- **PrizePool Contract**: 3-5 KSM

The storage deposit is refundable if the contract is removed, but it's locked while the contract exists.

## Security Considerations

1. **Admin Account**: Use a secure account for `owner` parameter. This account has significant control.
2. **Rake BPS**: Set appropriately - too high may discourage players, too low may not cover costs.
3. **Max Entries**: Set to prevent gas issues - each entry adds to storage.
4. **Max Entry Fee**: Set to prevent excessive fees that could cause gas issues.

## Verification

After instantiation, verify contracts:

1. **Check contract addresses** - Record both addresses
2. **Test RNG contract** - Commit and reveal a test value
3. **Test PrizePool contract** - Query `getPoolInfo()` to verify initialization
4. **Set frontend environment variables** - Update `.env` with contract addresses

