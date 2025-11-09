# Plan 1: Fix Contracts & Run Tests

## Overview
Fix compilation errors and get all contract tests passing. This is the foundation for everything else.

## Tasks

### 1. Fix RNG Contract Hash Function
- Replace `blake2b_256` with compatible hash function for ink! 4.3
- Use SHA-256 or appropriate alternative
- Update `hash_secret` and `generate_random_number` methods
- Ensure tests compile and pass

### 2. Fix PrizePool Test Failures
- Fix balance transfer issues in tests
- Ensure contract has sufficient balance for transfers
- Fix `test_execute_draw_and_claim` overflow issue
- Fix `test_withdraw_rake` overflow issue
- All 6 tests should pass

### 3. Verify Contract Compilation
- Both contracts compile without errors
- Only acceptable warnings are ink! dylint warnings
- Contracts build successfully with `cargo contract build`

### 4. Run Full Test Suite
- Run `./scripts/test_contract.sh`
- All tests pass for both contracts
- Document any remaining warnings

## Success Criteria
- ✅ Both contracts compile successfully
- ✅ All unit tests pass (6 PrizePool + 3 RNG = 9 tests)
- ✅ No compilation errors
- ✅ Build scripts work correctly

## Estimated Time
1-2 hours

