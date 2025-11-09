<!-- c84e4717-7ad9-46e9-a1f7-7f8366865ea2 4f2ffe03-57e0-459f-8b73-15a4e80f0d9e -->
# Post-MVP Production Readiness Plan

## Overview

Transform the MVP into a production-ready deployment on Kusama Asset Hub. Focus on testing, security, user experience, and operational readiness.

## Phase 1: Local Testing & Validation

### 1.1 Build and Test Contracts Locally

- Verify contracts compile without errors
- Run all unit tests (`./scripts/test_contract.sh`)
- Check for any ink! deprecation warnings
- Validate contract metadata generation

### 1.2 Frontend Integration Testing

- Test wallet connection flow
- Verify mock mode works correctly
- Test clicker button states (idle/press/hold/release)
- Test session start/end flow
- Test jackpot entry flow
- Verify pool info display updates correctly

### 1.3 Contract-Frontend Integration (Mock Mode)

- Ensure contract metadata files are properly structured
- Test contract client initialization
- Verify error handling for missing contracts
- Test all contract client methods in mock mode

## Phase 2: Testnet Deployment

### 2.1 Deploy to Testnet (Shibuya/Rococo)

- Set up testnet accounts and fund them
- Deploy RNG contract first
- Deploy PrizePool contract with RNG address
- Record deployed contract addresses
- Update frontend `.env` with testnet addresses

### 2.2 End-to-End Testing on Testnet

- Test complete user flow: click → session → entry → draw → claim
- Test admin functions: pause, withdraw rake, set rake BPS
- Test edge cases:
- Max entries reached
- Entry fee too high
- Claiming prize as non-winner
- Paused contract behavior
- Test with multiple users simultaneously
- Verify events are emitted correctly
- Check block subscriptions work reliably

### 2.3 Gas Optimization

- Measure gas costs for all contract calls
- Optimize storage reads/writes if needed
- Document gas costs for users
- Consider batch operations if gas is high

## Phase 3: Security Hardening

### 3.1 Contract Security Review

- Review PrizePool contract for:
- Reentrancy vulnerabilities
- Integer overflow/underflow
- Access control (admin-only functions)
- Pause functionality
- Edge cases in draw execution
- Review RNG contract for:
- Commit-reveal implementation correctness
- Secret validation
- Random number generation quality
- Add additional input validation where needed

### 3.2 Frontend Security

- Validate all user inputs
- Sanitize displayed data
- Implement rate limiting for contract calls
- Add transaction confirmation dialogs
- Handle failed transactions gracefully

### 3.3 Operational Security

- Document admin key management
- Plan for admin key rotation
- Set up monitoring/alerts for contract pause events
- Document emergency procedures

## Phase 4: User Experience Improvements

### 4.1 Frontend Polish

- Replace placeholder art assets with actual images
- Add loading states for all async operations
- Improve error messages (user-friendly)
- Add success notifications/toasts
- Implement transaction status tracking
- Add transaction history display

### 4.2 Responsive Design

- Test on mobile devices
- Ensure touch events work correctly
- Optimize layout for small screens
- Test on various browsers

### 4.3 Performance Optimization

- Optimize contract query batching
- Reduce unnecessary re-renders
- Add caching for pool info
- Optimize bundle size

### 4.4 Accessibility

- Add ARIA labels
- Ensure keyboard navigation works
- Test with screen readers
- Ensure sufficient color contrast

## Phase 5: Documentation & Operations

### 5.1 User Documentation

- Create user guide (how to play, enter jackpot)
- Create FAQ section
- Document how to verify fairness
- Add troubleshooting guide

### 5.2 Developer Documentation

- Document contract architecture
- Create deployment guide
- Document environment variables
- Create contributor guide

### 5.3 Operational Documentation

- Create runbook for admin operations
- Document monitoring setup
- Create incident response plan
- Document backup/recovery procedures

## Phase 6: Pre-Production Checklist

### 6.1 Contract Verification

- [ ] Contracts audited (or self-reviewed thoroughly)
- [ ] All tests passing
- [ ] Gas costs acceptable
- [ ] Contract addresses verified
- [ ] Admin functions tested

### 6.2 Frontend Verification

- [ ] All features working
- [ ] Error handling complete
- [ ] Loading states implemented
- [ ] Mobile responsive
- [ ] Cross-browser tested

### 6.3 Deployment Preparation

- [ ] Production RPC endpoint configured
- [ ] Contract addresses finalized
- [ ] Environment variables documented
- [ ] Frontend build tested
- [ ] CI/CD pipeline working

### 6.4 Legal & Compliance

- [ ] Terms of service drafted
- [ ] Privacy policy created
- [ ] Risk disclaimers added
- [ ] Compliance with jurisdiction requirements

## Phase 7: Kusama Asset Hub Deployment

### 7.1 Production Deployment

- Deploy RNG contract to Kusama Asset Hub
- Deploy PrizePool contract with production parameters
- Verify contracts on block explorer
- Update frontend production config
- Deploy frontend to hosting (Vercel/Netlify/etc)

### 7.2 Post-Deployment Verification

- Smoke test all functionality
- Verify events are being emitted
- Check transaction success rates
- Monitor for errors in logs
- Verify admin functions work

### 7.3 Monitoring Setup

- Set up error tracking (Sentry/etc)
- Set up analytics (optional)
- Monitor contract events
- Set up alerts for critical issues

## Phase 8: Future Enhancements (Post-Launch)

### 8.1 VRF Upgrade Path

- Research attested VRF solutions for Polkadot
- Design upgrade mechanism for RNG contract
- Plan migration strategy
- Document upgrade process

### 8.2 Feature Enhancements

- Entry history for users
- Draw history display
- Statistics dashboard
- Social sharing features

### 8.3 Scalability

- Consider XCM for multi-chain entries
- Optimize for high transaction volume
- Plan for Polkadot Asset Hub migration

## Priority Order

1. **Critical (Before Launch)**: Phases 1-3, 6.1-6.3
2. **Important (Launch Week)**: Phase 4.1-4.2, Phase 7
3. **Nice-to-Have (Post-Launch)**: Phase 4.3-4.4, Phase 5, Phase 8

## Success Criteria

- All contract tests passing
- Successful testnet deployment and full E2E test
- No critical security vulnerabilities
- Smooth user experience (no blocking bugs)
- Admin functions operational
- Production deployment successful
- Monitoring and alerting in place