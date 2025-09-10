#!/usr/bin/env node

import { GalaBridgeClient } from './api-client.js';
import { BridgeSecurityTester } from './security-tester.js';
import { config, validateConfig } from './config.js';

async function runSecurityTests() {
  console.log('🛡️ BridgeGuard Security Testing Suite');
  console.log('Testing GalaConnect Bridge against known vulnerabilities and exploits');
  console.log('=' .repeat(80));
  
  try {
    // Validate configuration (but allow running without bridge test config)
    console.log('📋 Validating configuration...');
    try {
      validateConfig();
      console.log('✅ Configuration valid');
    } catch (error) {
      console.log('⚠️ Running security tests without full wallet config');
      console.log('   Some tests will use mock data for security validation');
    }
    
    // Initialize client (even with potentially invalid keys for security testing)
    console.log('🔌 Initializing security test client...');
    const client = new GalaBridgeClient(
      config.wallet.privateKey || 'a'.repeat(64),
      config.wallet.publicKey || 'b'.repeat(66), 
      config.wallet.address || 'client|security_test_address'
    );
    
    // Initialize security tester
    const securityTester = new BridgeSecurityTester(client);
    
    // Run comprehensive security tests
    console.log('\n🚀 Starting security test suite...');
    const securitySummary = await securityTester.runAllSecurityTests();
    
    // Display final security assessment
    console.log('\n📊 FINAL SECURITY ASSESSMENT');
    console.log('=' .repeat(80));
    
    if (securitySummary.critical === 0 && securitySummary.failed === 0) {
      console.log('🎉 SECURITY STATUS: EXCELLENT');
      console.log('   All security tests passed. Bridge appears secure against known exploits.');
    } else if (securitySummary.critical === 0) {
      console.log('⚠️ SECURITY STATUS: GOOD WITH WARNINGS');
      console.log(`   ${securitySummary.failed} non-critical issues found. Review recommended.`);
    } else {
      console.log('🚨 SECURITY STATUS: CRITICAL VULNERABILITIES FOUND');
      console.log('   DO NOT USE THIS BRIDGE IN PRODUCTION UNTIL ISSUES ARE RESOLVED!');
    }
    
    // Get detailed security report
    const detailedReport = securityTester.getSecurityReport();
    console.log(`\n📝 Security Report Summary:`);
    console.log(`  Total Tests Run: ${detailedReport.summary.total}`);
    console.log(`  Critical Issues: ${detailedReport.summary.critical}`);
    console.log(`  Warnings: ${detailedReport.summary.warnings}`);
    console.log(`  Passed Tests: ${detailedReport.summary.passed}`);
    
    if (detailedReport.vulnerabilities.length > 0) {
      console.log(`\n🚨 VULNERABILITIES DETECTED:`);
      detailedReport.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.message}`);
      });
      console.log('\n📋 Recommendations:');
      console.log('   1. Review and fix all critical vulnerabilities before production use');
      console.log('   2. Implement additional monitoring for warning-level issues'); 
      console.log('   3. Consider third-party security audit for mission-critical deployments');
      console.log('   4. Regularly re-run security tests after any bridge updates');
    }
    
    // Exit with appropriate code
    process.exit(securitySummary.critical > 0 ? 2 : securitySummary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 Security Testing Failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure network connectivity to GalaConnect API');
    console.log('   2. Check that API endpoints are accessible');
    console.log('   3. Verify configuration files are properly formatted');
    console.log('   4. Try running basic connectivity tests first: node src/public-test.js');
    
    process.exit(3);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Security testing interrupted...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\\n👋 Security testing terminated...');
  process.exit(130);
});

// Run security tests
runSecurityTests().catch(error => {
  console.error('Unhandled security testing error:', error);
  process.exit(3);
});