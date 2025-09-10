#!/usr/bin/env node

import { BridgeSecurityTester } from './security-tester.js';
import { GalaBridgeClient } from './api-client.js';

// Demo with mock credentials for security testing
async function runSecurityDemo() {
  console.log('🛡️ BridgeGuard Security Testing Demo');
  console.log('Demonstrating security tests with mock credentials');
  console.log('=' .repeat(80));
  
  // Create mock client for security testing
  const mockClient = {
    baseUrl: 'https://dex-backend-prod1.defi.gala.com',
    auth: {
      walletAddress: 'client|demo_security_test',
      signRequest: (data) => {
        // Mock signature generation
        return 'a'.repeat(128); // 64-byte hex signature
      },
      prepareRequestBody: (data) => {
        return {
          ...data,
          signerPublicKey: 'b'.repeat(66),
          uniqueKey: `demo-${Date.now()}-${Math.random()}`
        };
      }
    },
    makeRequest: async (endpoint, method = 'GET', data = null) => {
      // Mock API responses for security testing
      console.log(`🔍 Mock API call: ${method} ${endpoint}`);
      
      if (endpoint.includes('admin/')) {
        throw new Error('403 Forbidden - Admin access denied');
      }
      
      if (endpoint === '/v1/connect/bridge-configurations') {
        return { data: { tokens: [] } };
      }
      
      if (data && JSON.stringify(data).length > 50000) {
        throw new Error('413 Payload Too Large');
      }
      
      return { success: true, demo: true };
    },
    getBridgeConfigurations: async () => ({ data: { tokens: [] } }),
    requestBridge: async () => ({ success: true, demo: true })
  };
  
  const securityTester = new BridgeSecurityTester(mockClient);
  
  console.log('\n🧪 Running Security Tests with Mock Data...\n');
  
  // Run individual security tests for demonstration
  const tests = [
    { name: 'Signature Validation', test: () => securityTester.testSignatureValidation() },
    { name: 'Replay Protection', test: () => securityTester.testSignatureReplayAttacks() },
    { name: 'Signature Malleability', test: () => securityTester.testSignatureMalleability() },
    { name: 'Rate Limiting', test: () => securityTester.testRateLimiting() },
    { name: 'Resource Exhaustion', test: () => securityTester.testResourceExhaustion() },
    { name: 'Privilege Escalation', test: () => securityTester.testPrivilegeEscalation() },
    { name: 'Double Spending', test: () => securityTester.testDoubleSpending() },
    { name: 'Invalid Tokens', test: () => securityTester.testInvalidTokenManipulation() }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await test();
      if (result.success) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED - ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ERROR - ${error.message}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 SECURITY DEMO SUMMARY');
  console.log('=' .repeat(80));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All security tests passed in demo mode!');
  } else {
    console.log(`\n⚠️ ${failed} tests failed - these would be flagged in production testing`);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Add your real wallet credentials to .env');
  console.log('2. Run: npm run security');
  console.log('3. Review any security findings before production use');
  console.log('4. Consider professional security audit for high-value bridges');
}

runSecurityDemo().catch(console.error);