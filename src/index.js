#!/usr/bin/env node

import { GalaBridgeClient } from './api-client.js';
import { BridgeTester } from './bridge-tester.js';
import { config, validateConfig } from './config.js';

async function main() {
  console.log('🌉 BridgeGuard - GalaChain Bridge Testing Bot');
  console.log('=' .repeat(50));
  
  try {
    // Validate configuration
    console.log('📋 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid');
    
    // Initialize client
    console.log('🔌 Connecting to GalaChain API...');
    const client = new GalaBridgeClient(
      config.wallet.privateKey,
      config.wallet.publicKey,
      config.wallet.address
    );
    
    // Initialize tester
    const tester = new BridgeTester(client);
    
    // Prepare test options
    const testOptions = {};
    if (config.testing.runBridgeTests && config.bridge.testRecipient) {
      testOptions.bridgeTest = {
        tokenClass: config.bridge.testTokenClass,
        amount: config.bridge.testAmount,
        recipient: config.bridge.testRecipient
      };
      console.log(`🧪 Bridge testing enabled for ${config.bridge.testTokenClass} to ${config.bridge.testRecipient}`);
    } else {
      console.log('⚠️  Bridge testing disabled (set RUN_BRIDGE_TESTS=true and provide recipient address)');
    }
    
    // Run all tests
    console.log('\n🚀 Starting test suite...');
    const summary = await tester.runAllTests(testOptions);
    
    // Display results
    console.log('\n📊 Test Results:');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      summary.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  • ${result.error}`);
        });
    }
    
    // Get detailed results
    const detailedResults = tester.getTestResults();
    console.log(`\n📝 Total Log Entries: ${detailedResults.logs.length}`);
    console.log(`  Errors: ${detailedResults.summary.errors}`);
    console.log(`  Warnings: ${detailedResults.summary.warnings}`);
    console.log(`  Successes: ${detailedResults.summary.successes}`);
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 Fatal Error:', error.message);
    
    if (error.message.includes('Missing required configuration')) {
      console.log('\n📝 Setup Instructions:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Fill in your wallet credentials');
      console.log('3. Configure bridge test parameters (set TEST_RECIPIENT for Ethereum address)');
      console.log('4. Run the bot again');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down BridgeGuard...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down BridgeGuard...');
  process.exit(0);
});

// Run the bot
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});