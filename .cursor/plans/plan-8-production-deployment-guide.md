# Production Deployment Guide - Kusama Asset Hub

## Overview
This guide walks through deploying CoreTime Clicker to Kusama Asset Hub production.

## Prerequisites

1. **Production Account Setup**
   - Admin account with sufficient KSM for deployment
   - Account secured (hardware wallet recommended)
   - Backup of admin key secured

2. **Production RPC Endpoint**
   - `wss://kusama-asset-hub-rpc.polkadot.io`
   - Alternative: `wss://kusama-asset-hub-rpc.dwellir.com`

3. **Required Assets**
   - Contracts built and tested
   - Frontend built and tested
   - All documentation complete

## Step 1: Final Pre-Deployment Checks

### Contract Verification
```bash
# Run all tests
./scripts/test_contract.sh

# Build release contracts
./scripts/build_contract.sh --release

# Verify artifacts exist
ls -la artifacts/
```

### Frontend Verification
```bash
cd frontend
npm run build
npm run preview  # Test production build locally
```

### Security Review
- [ ] Review SECURITY.md
- [ ] Verify all security measures in place
- [ ] Check admin key security
- [ ] Review access control

## Step 2: Deploy RNG Contract

### Deployment Parameters
- **min_reveal_blocks**: `10` (or higher for production security)

### Using Polkadot.js Apps UI (Recommended)

1. Navigate to [Polkadot.js Apps - Kusama Asset Hub](https://polkadot.js.org/apps/?rpc=wss://kusama-asset-hub-rpc.polkadot.io)
2. Connect with admin account
3. Go to **Developer** → **Contracts** → **Upload & deploy code**
4. Upload `artifacts/rng.contract`
5. Select `new` constructor
6. Enter `min_reveal_blocks = 10`
7. Set endowment: ~2-3 KSM (for storage deposit)
8. Review transaction details carefully
9. Submit and sign transaction
10. **Record the deployed contract address**
11. Verify contract on block explorer

### Verification
- [ ] Contract address recorded
- [ ] Contract visible on block explorer
- [ ] Constructor parameters correct
- [ ] Storage deposit paid

## Step 3: Deploy PrizePool Contract

### Deployment Parameters
- **admin**: Production admin address
- **rake_bps**: `500` (5% - adjust as needed)
- **rng_address**: RNG contract address from Step 2
- **max_entries_per_draw**: `100`
- **max_entry_fee**: `1000000000000` (1 KSM)

### Using Polkadot.js Apps UI

1. Upload `artifacts/prize_pool.contract`
2. Select `new` constructor
3. Enter parameters:
   - `admin`: Your production admin address
   - `rake_bps`: `500`
   - `rng_address`: RNG contract address
   - `max_entries_per_draw`: `100`
   - `max_entry_fee`: `1000000000000`
4. Set endowment: ~3-5 KSM
5. **Double-check all parameters**
6. Submit and sign transaction
7. **Record the deployed contract address**
8. Verify contract on block explorer

### Verification
- [ ] Contract address recorded
- [ ] Contract visible on block explorer
- [ ] All constructor parameters correct
- [ ] Storage deposit paid
- [ ] Contract state initialized correctly

## Step 4: Update Frontend Configuration

### Create Production Environment File

Create `frontend/.env.production`:

```env
# Production Configuration - Kusama Asset Hub
VITE_RPC_ENDPOINT=wss://kusama-asset-hub-rpc.polkadot.io
VITE_PRIZE_POOL_ADDRESS=<production_prize_pool_address>
VITE_RNG_ADDRESS=<production_rng_address>
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500
VITE_TOKEN_DECIMALS=12
VITE_TOKEN_SYMBOL=KSM
VITE_ADMIN_ADDRESS=<production_admin_address>
VITE_USE_MOCK=false
```

### Copy Metadata

```bash
# Copy contract metadata to frontend
./scripts/copy_metadata.sh
# Or on Windows:
.\scripts\copy_metadata.ps1
```

### Build Production Frontend

```bash
cd frontend
npm run build
```

Verify build output in `frontend/dist/`

## Step 5: Deploy Frontend

### Option 1: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to frontend directory: `cd frontend`
3. Deploy: `vercel --prod`
4. Set environment variables in Vercel dashboard
5. Verify deployment

### Option 2: Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Navigate to frontend directory: `cd frontend`
3. Deploy: `netlify deploy --prod`
4. Set environment variables in Netlify dashboard
5. Verify deployment

### Option 3: GitHub Pages

1. Build frontend: `npm run build`
2. Configure GitHub Pages to serve `dist/` directory
3. Set environment variables (may require build-time injection)
4. Verify deployment

### Option 4: Self-Hosted

1. Build frontend: `npm run build`
2. Upload `dist/` to web server
3. Configure web server (nginx/Apache)
4. Set environment variables
5. Configure HTTPS
6. Verify deployment

## Step 6: Post-Deployment Verification

### Immediate Verification (0-15 minutes)

- [ ] **Frontend Accessible**
  - Open deployed frontend URL
  - Verify page loads
  - Check for console errors

- [ ] **Wallet Connection**
  - Connect wallet
  - Verify address displays
  - Check account selection works

- [ ] **Contract Connection**
  - Verify pool info loads
  - Check contract addresses correct
  - Verify no connection errors

- [ ] **Basic Functionality**
  - Test play session
  - Verify click counter works
  - Test session end

### Functional Testing (15-60 minutes)

- [ ] **Enter Jackpot**
  - Enter jackpot with test amount
  - Verify transaction succeeds
  - Check pool balance updates
  - Verify entry count increases

- [ ] **Admin Functions** (as admin)
  - Execute draw
  - Verify winner selected
  - Pause/unpause contract
  - Withdraw rake
  - Set rake BPS

- [ ] **Claim Prize** (if winner)
  - Claim prize
  - Verify transaction succeeds
  - Check balance increases

### Monitoring (First 24 Hours)

- [ ] **Error Monitoring**
  - Check error tracking dashboard
  - Review error logs
  - Fix any critical errors

- [ ] **Transaction Monitoring**
  - Monitor transaction success rates
  - Check for failed transactions
  - Verify gas costs acceptable

- [ ] **Contract Monitoring**
  - Monitor contract balance
  - Track events emitted
  - Check for suspicious activity

- [ ] **Performance Monitoring**
  - Monitor page load times
  - Check RPC response times
  - Verify no performance issues

## Step 7: Post-Deployment Checklist

### Day 1
- [ ] All functionality verified
- [ ] No critical errors
- [ ] Monitor user activity
- [ ] Respond to user feedback

### Week 1
- [ ] Monitor contract balance
- [ ] Track transaction patterns
- [ ] Collect user feedback
- [ ] Plan improvements

### Month 1
- [ ] Review usage statistics
- [ ] Analyze gas costs
- [ ] Plan optimizations
- [ ] Consider upgrades

## Troubleshooting

### Contract Deployment Issues

**Error: "Insufficient balance"**
- Ensure account has enough KSM for storage deposit
- Check current KSM balance
- Account for transaction fees

**Error: "Code upload failed"**
- Verify contract file is correct
- Check file size limits
- Try uploading again

### Frontend Deployment Issues

**Error: "Environment variables not loading"**
- Verify variables set in hosting platform
- Check variable names (must start with `VITE_`)
- Restart deployment

**Error: "Contract connection failed"**
- Verify contract addresses correct
- Check RPC endpoint accessible
- Verify network connectivity

### Production Issues

**High Error Rate**
- Check error logs
- Review recent changes
- Consider rollback if critical

**Gas Costs Too High**
- Monitor gas costs
- Consider optimizations
- Document for users

## Rollback Procedure

If critical issues are discovered:

1. **Pause Contract**
   - Use admin panel to pause contract
   - Prevents new entries/claims

2. **Frontend Rollback**
   - Revert to previous deployment
   - Or update frontend with fixes

3. **Contract Upgrade** (if needed)
   - Deploy new contract version
   - Migrate state if possible
   - Update frontend addresses

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Contract Metrics**
   - Total entries
   - Pool balance
   - Rake balance
   - Draw count
   - Claim count

2. **User Metrics**
   - Active users
   - Transaction count
   - Average entry fee
   - Success rate

3. **Performance Metrics**
   - Page load time
   - RPC response time
   - Transaction confirmation time
   - Error rate

## Support & Maintenance

### Regular Maintenance Tasks

- **Weekly**
  - Review error logs
  - Check contract balance
  - Monitor transaction success rates

- **Monthly**
  - Review usage statistics
  - Analyze gas costs
  - Plan improvements
  - Update documentation

### Emergency Contacts

- **Admin Key Holder**: [Contact Info]
- **Developer**: [Contact Info]
- **Support**: [Contact Info]

## Success Criteria

- [x] Contracts deployed to Kusama Asset Hub
- [ ] Frontend deployed and accessible
- [ ] All functionality works in production
- [ ] No critical errors
- [ ] Monitoring active
- [ ] Users can successfully interact

## Next Steps

After successful deployment:
1. Monitor for issues
2. Collect user feedback
3. Plan improvements
4. Consider upgrades (VRF, multi-sig, etc.)
5. Plan for Polkadot Asset Hub migration

