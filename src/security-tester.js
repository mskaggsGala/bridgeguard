#!/usr/bin/env node

import crypto from 'crypto';
import { GalaBridgeClient } from './api-client.js';
import { GalaAuth } from './auth.js';

export class BridgeSecurityTester {
  constructor(client) {
    this.client = client;
    this.testResults = [];
    this.vulnerabilities = [];
  }

  log(message, type = 'info', severity = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type, severity };
    
    const icon = {
      'info': '🔍',
      'success': '✅', 
      'warning': '⚠️',
      'error': '❌',
      'critical': '🚨',
      'security': '🛡️'
    }[type] || '📋';
    
    console.log(`[${timestamp}] ${icon} ${message}`);
    this.testResults.push(logEntry);
    
    if (type === 'critical' || severity === 'high') {
      this.vulnerabilities.push(logEntry);
    }
  }

  async runSecurityTest(testName, testFunction, severity = 'medium') {
    this.log(`Starting security test: ${testName}`, 'security');
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      this.log(`Security test passed: ${testName} (${duration}ms)`, 'success');
      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`Security test failed: ${testName} - ${error.message} (${duration}ms)`, 'critical', severity);
      return { success: false, error: error.message, duration, severity };
    }
  }

  // =====================================================
  // SIGNATURE VALIDATION TESTS
  // =====================================================

  async testSignatureValidation() {
    return await this.runSecurityTest('Signature Validation', async () => {
      const testData = { test: 'signature_validation', timestamp: Date.now() };
      
      // Test 1: Valid signature
      const validSignature = this.client.auth.signRequest(testData);
      if (!validSignature || validSignature.length !== 128) {
        throw new Error('Valid signature generation failed or incorrect length');
      }
      
      // Test 2: Invalid signature format
      const invalidSignatures = [
        '', // Empty signature
        '0x', // Only prefix
        'invalid_signature', // Non-hex
        '0'.repeat(127), // Too short
        '0'.repeat(129), // Too long
        'g'.repeat(128), // Invalid hex chars
      ];
      
      for (const invalidSig of invalidSignatures) {
        if (this.isSignatureValid(invalidSig, testData)) {
          throw new Error(`Invalid signature was accepted: ${invalidSig.slice(0, 20)}...`);
        }
      }
      
      return { validSignature, testedInvalidSignatures: invalidSignatures.length };
    }, 'high');
  }

  async testSignatureReplayAttacks() {
    return await this.runSecurityTest('Signature Replay Protection', async () => {
      const testData = { 
        action: 'transfer', 
        amount: '100',
        timestamp: Date.now()
      };
      
      // Test 1: Basic replay attack simulation
      const signature1 = this.client.auth.signRequest(testData);
      const signature2 = this.client.auth.signRequest(testData);
      
      if (signature1 === signature2) {
        throw new Error('CRITICAL: Signatures are deterministic - replay attacks possible!');
      }
      
      // Test 2: Cross-chain replay protection (chain ID should be included)
      const ethereumData = { ...testData, chainId: 2 };
      const galaChainData = { ...testData, chainId: 1 };
      
      const ethSig = this.client.auth.signRequest(ethereumData);
      const galaSig = this.client.auth.signRequest(galaChainData);
      
      if (ethSig === galaSig) {
        throw new Error('WARNING: Chain ID not included in signature - cross-chain replay possible');
      }
      
      // Test 3: Unique key usage (BridgeGuard uses uniqueKey)
      const requestWithUniqueKey = this.client.auth.prepareRequestBody(testData);
      if (!requestWithUniqueKey.uniqueKey) {
        throw new Error('CRITICAL: No unique key in request - replay attacks possible!');
      }
      
      return { 
        replayProtected: true,
        uniqueKeyPresent: !!requestWithUniqueKey.uniqueKey,
        chainIdSeparation: ethSig !== galaSig
      };
    }, 'high');
  }

  async testSignatureMalleability() {
    return await this.runSecurityTest('Signature Malleability', async () => {
      const testData = { test: 'malleability', timestamp: Date.now() };
      const signature = this.client.auth.signRequest(testData);
      
      // Test signature format manipulations
      const manipulatedSignatures = [
        signature.toLowerCase(),
        signature.toUpperCase(),
        '0x' + signature,
        signature.replace(/^0x/, ''),
      ];
      
      const originalValid = this.isSignatureValid(signature, testData);
      let vulnerableToMalleability = false;
      
      for (const manipulated of manipulatedSignatures) {
        if (manipulated !== signature && this.isSignatureValid(manipulated, testData)) {
          vulnerableToMalleability = true;
          break;
        }
      }
      
      if (vulnerableToMalleability) {
        throw new Error('CRITICAL: Signature malleability detected - different formats accepted!');
      }
      
      return { malleabilityProtected: true, originalValid };
    }, 'high');
  }

  // =====================================================
  // RATE LIMITING & DOS PROTECTION TESTS  
  // =====================================================

  async testRateLimiting() {
    return await this.runSecurityTest('Rate Limiting Protection', async () => {
      const startTime = Date.now();
      const requests = [];
      const rapidRequestCount = 25; // Exceed the 20 requests/10sec limit
      
      // Simulate rapid requests
      for (let i = 0; i < rapidRequestCount; i++) {
        const requestPromise = this.client.getBridgeConfigurations()
          .then(() => ({ success: true, index: i }))
          .catch(error => ({ 
            success: false, 
            index: i, 
            error: error.message,
            isRateLimit: error.message.includes('rate limit') || error.message.includes('429')
          }));
        requests.push(requestPromise);
      }
      
      const results = await Promise.all(requests);
      const successful = results.filter(r => r.success).length;
      const rateLimited = results.filter(r => !r.success && r.isRateLimit).length;
      const totalTime = Date.now() - startTime;
      
      this.log(`Rate limiting test: ${successful} successful, ${rateLimited} rate limited in ${totalTime}ms`);
      
      // If all requests succeeded, rate limiting may not be working
      if (successful === rapidRequestCount) {
        throw new Error('WARNING: No rate limiting detected - all rapid requests succeeded');
      }
      
      return { 
        successful, 
        rateLimited, 
        totalRequests: rapidRequestCount,
        avgResponseTime: totalTime / rapidRequestCount
      };
    }, 'medium');
  }

  async testResourceExhaustion() {
    return await this.runSecurityTest('Resource Exhaustion Protection', async () => {
      // Test large payload handling
      const largePayload = {
        data: 'x'.repeat(100000), // 100KB payload
        timestamp: Date.now()
      };
      
      try {
        await this.client.makeRequest('/v1/connect/bridge/request', 'POST', largePayload);
        throw new Error('WARNING: Large payload accepted - potential DoS vector');
      } catch (error) {
        if (error.message.includes('payload too large') || error.message.includes('413')) {
          return { payloadSizeProtected: true };
        }
        // Re-throw if it's not a size-related error
        throw error;
      }
    }, 'medium');
  }

  // =====================================================
  // AUTHORIZATION & ACCESS CONTROL TESTS
  // =====================================================

  async testUnauthorizedAccess() {
    return await this.runSecurityTest('Unauthorized Access Protection', async () => {
      const unauthorizedClient = new GalaBridgeClient(
        'a'.repeat(64), // Invalid private key
        'b'.repeat(66), // Invalid public key  
        'client|invalid_address'
      );
      
      try {
        // Attempt unauthorized bridge request
        const result = await unauthorizedClient.requestBridge(
          'client|invalid_address',
          2, // Ethereum
          '0x0000000000000000000000000000000000000000',
          '1',
          { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' }
        );
        
        if (result && !result.error) {
          throw new Error('CRITICAL: Unauthorized request succeeded!');
        }
      } catch (error) {
        if (error.message.includes('unauthorized') || error.message.includes('invalid signature')) {
          return { unauthorizedAccessBlocked: true };
        }
        throw error;
      }
      
      return { unauthorizedAccessBlocked: true };
    }, 'high');
  }

  async testPrivilegeEscalation() {
    return await this.runSecurityTest('Privilege Escalation Protection', async () => {
      // Test if regular user can access admin functions
      const adminEndpoints = [
        '/admin/bridge/pause',
        '/admin/bridge/unpause', 
        '/admin/bridge/setfees',
        '/admin/validators/add',
        '/admin/validators/remove'
      ];
      
      let adminAccessAttempts = 0;
      let successfulEscalations = 0;
      
      for (const endpoint of adminEndpoints) {
        try {
          adminAccessAttempts++;
          const result = await this.client.makeRequest(endpoint, 'POST', { test: true });
          
          if (result && !result.error) {
            successfulEscalations++;
            this.log(`WARNING: Admin endpoint accessible: ${endpoint}`, 'warning');
          }
        } catch (error) {
          // Expected - admin endpoints should be blocked
          if (!error.message.includes('404') && !error.message.includes('403') && !error.message.includes('unauthorized')) {
            this.log(`Unexpected error on admin endpoint ${endpoint}: ${error.message}`, 'warning');
          }
        }
      }
      
      if (successfulEscalations > 0) {
        throw new Error(`CRITICAL: ${successfulEscalations}/${adminAccessAttempts} admin endpoints accessible!`);
      }
      
      return { privilegeEscalationBlocked: true, testedEndpoints: adminAccessAttempts };
    }, 'high');
  }

  // =====================================================
  // BRIDGE-SPECIFIC EXPLOIT TESTS
  // =====================================================

  async testDoubleSpending() {
    return await this.runSecurityTest('Double Spending Protection', async () => {
      const bridgeRequest = {
        walletAddress: this.client.auth.walletAddress,
        destinationChainId: 2,
        recipient: '0x1234567890123456789012345678901234567890',
        quantity: '1',
        token: { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' }
      };
      
      // Attempt to submit the same bridge request multiple times rapidly
      const duplicateRequests = Array(5).fill(null).map(() => 
        this.client.requestBridge(
          bridgeRequest.walletAddress,
          bridgeRequest.destinationChainId,
          bridgeRequest.recipient,
          bridgeRequest.quantity,
          bridgeRequest.token
        ).catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(duplicateRequests);
      const successful = results.filter(r => r && !r.error).length;
      
      if (successful > 1) {
        throw new Error(`CRITICAL: Double spending possible - ${successful} identical requests succeeded!`);
      }
      
      return { doubleSpendingBlocked: true, duplicateRequestsBlocked: results.length - successful };
    }, 'high');
  }

  async testInvalidTokenManipulation() {
    return await this.runSecurityTest('Invalid Token Manipulation', async () => {
      const invalidTokens = [
        { collection: '', category: 'Unit', type: 'none', additionalKey: 'none' },
        { collection: null, category: 'Unit', type: 'none', additionalKey: 'none' },
        { collection: 'NONEXISTENT_TOKEN', category: 'Unit', type: 'none', additionalKey: 'none' },
        { collection: 'GALA', category: 'Admin', type: 'none', additionalKey: 'none' }, // Invalid category
        { collection: 'GALA', category: 'Unit', type: 'exploit', additionalKey: 'none' }, // Invalid type
      ];
      
      let invalidTokensAccepted = 0;
      
      for (const token of invalidTokens) {
        try {
          const result = await this.client.requestBridge(
            this.client.auth.walletAddress,
            2,
            '0x1234567890123456789012345678901234567890',
            '1',
            token
          );
          
          if (result && !result.error) {
            invalidTokensAccepted++;
            this.log(`WARNING: Invalid token accepted: ${JSON.stringify(token)}`, 'warning');
          }
        } catch (error) {
          // Expected - invalid tokens should be rejected
        }
      }
      
      if (invalidTokensAccepted > 0) {
        throw new Error(`WARNING: ${invalidTokensAccepted} invalid tokens were accepted`);
      }
      
      return { invalidTokensBlocked: true, testedTokens: invalidTokens.length };
    }, 'medium');
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  isSignatureValid(signature, data) {
    try {
      // Basic signature format validation
      if (!signature || typeof signature !== 'string') return false;
      if (signature.length !== 128) return false;
      if (!/^[0-9a-fA-F]+$/.test(signature)) return false;
      
      // Additional validation would require implementing signature verification
      // This is a simplified check for format validity
      return true;
    } catch {
      return false;
    }
  }

  // =====================================================
  // MAIN TEST RUNNER
  // =====================================================

  async runAllSecurityTests() {
    this.log('🛡️ Starting Comprehensive Bridge Security Testing', 'security');
    this.log('Testing against common bridge exploits and vulnerabilities', 'info');
    console.log('=' .repeat(80));
    
    const securityTests = [
      // Signature Security
      () => this.testSignatureValidation(),
      () => this.testSignatureReplayAttacks(),
      () => this.testSignatureMalleability(),
      
      // DoS Protection  
      () => this.testRateLimiting(),
      () => this.testResourceExhaustion(),
      
      // Access Control
      () => this.testUnauthorizedAccess(),
      () => this.testPrivilegeEscalation(),
      
      // Bridge-Specific Exploits
      () => this.testDoubleSpending(),
      () => this.testInvalidTokenManipulation()
    ];

    const results = [];
    let criticalVulnerabilities = 0;
    
    for (const test of securityTests) {
      const result = await test();
      results.push(result);
      
      if (!result.success && result.severity === 'high') {
        criticalVulnerabilities++;
      }
      
      // Add delay between security tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate security summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      critical: criticalVulnerabilities,
      vulnerabilities: this.vulnerabilities,
      results
    };

    console.log('\n' + '=' .repeat(80));
    this.log('🛡️ SECURITY TEST SUMMARY', 'security');
    console.log('=' .repeat(80));
    console.log(`Total Security Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`🚨 Critical Vulnerabilities: ${summary.critical}`);
    
    if (summary.critical > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES FOUND:');
      this.vulnerabilities
        .filter(v => v.severity === 'high')
        .forEach(vuln => {
          console.log(`  • ${vuln.message}`);
        });
    }
    
    if (summary.failed === 0) {
      this.log('🎉 ALL SECURITY TESTS PASSED - Bridge appears secure!', 'success');
    } else if (summary.critical === 0) {
      this.log('⚠️ Some tests failed but no critical vulnerabilities found', 'warning');
    } else {
      this.log('🚨 CRITICAL VULNERABILITIES DETECTED - DO NOT USE IN PRODUCTION!', 'critical');
    }

    return summary;
  }

  getSecurityReport() {
    return {
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      summary: {
        total: this.testResults.length,
        critical: this.testResults.filter(r => r.severity === 'high').length,
        warnings: this.testResults.filter(r => r.type === 'warning').length,
        passed: this.testResults.filter(r => r.type === 'success').length
      }
    };
  }
}