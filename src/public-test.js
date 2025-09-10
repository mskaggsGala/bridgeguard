#!/usr/bin/env node

import fetch from 'node-fetch';

class PublicAPITester {
  constructor() {
    this.baseUrl = 'https://dex-backend-prod1.defi.gala.com';
    this.swapUrl = 'https://api-galaswap.gala.com';
  }

  async makeRequest(url, options = {}) {
    try {
      console.log(`📡 Requesting: ${url}`);
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(result)}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      return null;
    }
  }

  async testBridgeConfigurations() {
    console.log('\n🌉 Testing Bridge Configurations...');
    console.log('=' .repeat(50));
    
    // Test general bridge configurations
    const configs = await this.makeRequest(`${this.baseUrl}/v1/connect/bridge-configurations`);
    
    if (configs && configs.data && configs.data.tokens) {
      console.log(`✅ Found ${configs.data.tokens.length} bridgeable tokens:`);
      
      configs.data.tokens.forEach((token, index) => {
        console.log(`\n${index + 1}. ${token.name} (${token.symbol})`);
        console.log(`   Network: ${token.network}`);
        console.log(`   Verified: ${token.verified ? '✅' : '❌'}`);
        console.log(`   Decimals: ${token.decimals}`);
        
        if (token.canBridgeTo && token.canBridgeTo.length > 0) {
          console.log(`   Can bridge to:`);
          token.canBridgeTo.forEach(bridge => {
            console.log(`     → ${bridge.network} (${bridge.symbol}) Chain ID: ${bridge.destinationChainIds.join(', ')}`);
          });
        }
        
        if (token.otherNetworks && token.otherNetworks.length > 0) {
          console.log(`   Other networks:`);
          token.otherNetworks.forEach(network => {
            console.log(`     → ${network.network}: ${network.symbol} (${network.contractAddress})`);
          });
        }
      });
    }
    
    // Test specific token search
    console.log('\n🔍 Testing GALA token search...');
    const galaConfig = await this.makeRequest(`${this.baseUrl}/v1/connect/bridge-configurations?searchprefix=GALA`);
    
    if (galaConfig && galaConfig.data && galaConfig.data.tokens) {
      console.log(`✅ Found ${galaConfig.data.tokens.length} GALA-related tokens`);
    }
    
    return configs;
  }

  async testAvailableSwaps() {
    console.log('\n💱 Testing Available Swaps...');
    console.log('=' .repeat(50));
    
    const swaps = await this.makeRequest(`${this.swapUrl}/api/swap/available`);
    
    if (swaps) {
      console.log('✅ Available swaps endpoint responded');
      console.log('📄 Response structure:', Object.keys(swaps));
      
      if (Array.isArray(swaps)) {
        console.log(`📊 Found ${swaps.length} available swaps`);
        swaps.slice(0, 3).forEach((swap, index) => {
          console.log(`\n${index + 1}. Swap ID: ${swap.id || 'N/A'}`);
          console.log(`   Details:`, JSON.stringify(swap, null, 2).slice(0, 200) + '...');
        });
      }
    }
    
    return swaps;
  }

  async testConnectivity() {
    console.log('\n🔌 Testing API Connectivity...');
    console.log('=' .repeat(50));
    
    const endpoints = [
      { name: 'GalaConnect API', url: this.baseUrl },
      { name: 'GalaSwap API', url: this.swapUrl }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, { method: 'HEAD' });
        console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  async runAllTests() {
    console.log('🧪 BridgeGuard Public API Tests');
    console.log('Testing endpoints that don\'t require wallet authentication');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
      await this.testConnectivity();
      await this.testBridgeConfigurations();
      await this.testAvailableSwaps();
      
      const duration = Date.now() - startTime;
      console.log(`\n✅ All tests completed in ${duration}ms`);
      console.log('\n💡 Next steps:');
      console.log('   1. Add wallet credentials to .env file');
      console.log('   2. Set TEST_RECIPIENT to your Ethereum address');
      console.log('   3. Run: npm start');
      
    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new PublicAPITester();
tester.runAllTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});