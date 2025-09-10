import { GalaBridgeClient } from './api-client.js';

export class BridgeTester {
  constructor(client) {
    this.client = client;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    this.testResults.push(logEntry);
  }

  async runTest(testName, testFunction) {
    this.log(`Starting test: ${testName}`, 'test');
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      this.log(`Test passed: ${testName} (${duration}ms)`, 'success');
      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`Test failed: ${testName} - ${error.message} (${duration}ms)`, 'error');
      return { success: false, error: error.message, duration };
    }
  }

  async testWalletConnection() {
    return await this.runTest('Wallet Connection', async () => {
      const walletInfo = await this.client.getWalletInfo();
      if (!walletInfo) {
        throw new Error('Failed to get wallet info');
      }
      return walletInfo;
    });
  }

  async testTokenBalances() {
    return await this.runTest('Token Balances', async () => {
      const balances = await this.client.getAllTokenBalances();
      if (!balances) {
        throw new Error('Failed to get token balances');
      }
      return balances;
    });
  }

  async testBridgeConfigurations() {
    return await this.runTest('Bridge Configurations', async () => {
      const bridgeConfigs = await this.client.getBridgeConfigurations();
      if (!bridgeConfigs || !bridgeConfigs.data) {
        throw new Error('Failed to get bridge configurations');
      }
      return bridgeConfigs;
    });
  }

  async testSpecificTokenBalance(tokenClass = 'GALA', tokenInstance = '0') {
    return await this.runTest(`${tokenClass} Token Balance`, async () => {
      const balance = await this.client.getTokenBalance(tokenClass, tokenInstance);
      if (balance === null || balance === undefined) {
        throw new Error(`Failed to get ${tokenClass} balance`);
      }
      return balance;
    });
  }

  async testSwapOperations() {
    return await this.runTest('Available Swaps', async () => {
      const swaps = await this.client.getAvailableSwaps();
      if (!swaps) {
        throw new Error('Failed to get available swaps');
      }
      return swaps;
    });
  }

  async testBridgeFlow(tokenClass, amount, recipient) {
    if (!tokenClass || !amount || !recipient) {
      this.log('Skipping bridge flow test - missing parameters', 'warning');
      return { success: false, error: 'Missing required parameters' };
    }

    return await this.runTest(`Bridge Flow: ${tokenClass} to Ethereum`, async () => {
      const walletAddress = this.client.auth.walletAddress;
      
      // Check initial balance
      const initialBalance = await this.client.getTokenBalance(tokenClass);
      this.log(`Initial balance: ${JSON.stringify(initialBalance)}`);

      // Create token object based on tokenClass
      const token = {
        collection: tokenClass,
        category: 'Unit',
        type: 'none',
        additionalKey: 'none'
      };

      // Request bridge transaction (this gets the fee and DTO)
      const bridgeRequest = await this.client.requestBridge(
        walletAddress,
        2, // Ethereum chain ID
        recipient,
        amount.toString(),
        token
      );
      
      if (!bridgeRequest || !bridgeRequest.data) {
        throw new Error('Bridge request failed');
      }

      this.log(`Bridge fee: ${bridgeRequest.data.fee} ${bridgeRequest.data.feeToken}`);
      
      return {
        fee: bridgeRequest.data.fee,
        feeToken: bridgeRequest.data.feeToken,
        initialBalance,
        bridgeRequestData: bridgeRequest.data
      };
    });
  }

  async runAllTests(options = {}) {
    this.log('Starting comprehensive bridge tests', 'test');
    
    const tests = [
      () => this.testWalletConnection(),
      () => this.testTokenBalances(),
      () => this.testBridgeConfigurations(),
      () => this.testSpecificTokenBalance('GALA'),
      () => this.testSpecificTokenBalance('MUSIC'),
      () => this.testSwapOperations()
    ];

    // Add bridge flow test if parameters provided
    if (options.bridgeTest) {
      tests.push(() => this.testBridgeFlow(
        options.bridgeTest.tokenClass,
        options.bridgeTest.amount,
        options.bridgeTest.recipient
      ));
    }

    const results = [];
    for (const test of tests) {
      const result = await test();
      results.push(result);
      
      // Add delay between tests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };

    this.log(`Test Summary: ${summary.passed}/${summary.total} passed`, 
      summary.failed === 0 ? 'success' : 'warning');

    return summary;
  }

  getTestResults() {
    return {
      logs: this.testResults,
      summary: {
        total: this.testResults.length,
        errors: this.testResults.filter(r => r.type === 'error').length,
        warnings: this.testResults.filter(r => r.type === 'warning').length,
        successes: this.testResults.filter(r => r.type === 'success').length
      }
    };
  }
}