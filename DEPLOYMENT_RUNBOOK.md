# Deployment Runbook

## Quick Reference

### Contract Addresses
- **RNG Contract**: `[TO_BE_FILLED]`
- **PrizePool Contract**: `[TO_BE_FILLED]`
- **Admin Address**: `[TO_BE_FILLED]`

### RPC Endpoints
- **Production**: `wss://kusama-asset-hub-rpc.polkadot.io`
- **Backup**: `wss://kusama-asset-hub-rpc.dwellir.com`

### Frontend URLs
- **Production**: `[TO_BE_FILLED]`
- **Staging**: `[TO_BE_FILLED]`

## Emergency Procedures

### Contract Pause
```bash
# Via Admin Panel
1. Connect admin wallet
2. Click "Pause Contract"
3. Confirm transaction
```

### Contract Unpause
```bash
# Via Admin Panel
1. Connect admin wallet
2. Click "Unpause Contract"
3. Confirm transaction
```

### Emergency Withdrawal
```bash
# Withdraw all rake
1. Connect admin wallet
2. Click "Withdraw Rake"
3. Confirm transaction
```

## Common Operations

### Execute Draw
1. Connect admin wallet
2. Navigate to Admin Panel
3. Click "Execute Draw"
4. Confirm transaction
5. Verify winner selected

### Withdraw Rake
1. Connect admin wallet
2. Navigate to Admin Panel
3. Click "Withdraw Rake"
4. Confirm transaction
5. Verify balance increases

### Set Rake BPS
1. Connect admin wallet
2. Navigate to Admin Panel
3. Enter new rake BPS (0-10000)
4. Click "Set Rake"
5. Confirm transaction

## Monitoring Commands

### Check Contract State
```bash
# Query pool info
# Use Polkadot.js Apps UI or API
```

### Check Recent Events
```bash
# Query contract events
# Use block explorer or API
```

### Check Balance
```bash
# Check contract balance
# Use block explorer
```

## Troubleshooting

### Issue: Contract Not Responding
1. Check if contract is paused
2. Verify RPC endpoint is accessible
3. Check contract balance
4. Review recent transactions

### Issue: Frontend Not Loading
1. Check frontend URL is accessible
2. Verify environment variables set
3. Check browser console for errors
4. Verify contract addresses correct

### Issue: Transactions Failing
1. Check account balance
2. Verify gas limits
3. Check contract state
4. Review error messages

## Contact Information

- **Admin**: [Contact Info]
- **Developer**: [Contact Info]
- **Support**: [Contact Info]

