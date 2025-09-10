import dotenv from 'dotenv';

dotenv.config();

export const config = {
  wallet: {
    privateKey: process.env.PRIVATE_KEY,
    publicKey: process.env.PUBLIC_KEY,
    address: process.env.WALLET_ADDRESS
  },
  
  bridge: {
    testTokenClass: process.env.TEST_TOKEN_CLASS || 'MUSIC',
    testAmount: parseInt(process.env.TEST_AMOUNT) || 1,
    testRecipient: process.env.TEST_RECIPIENT
  },
  
  testing: {
    runBridgeTests: process.env.RUN_BRIDGE_TESTS === 'true',
    rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY) || 500,
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

export function validateConfig() {
  const required = [
    'wallet.privateKey',
    'wallet.publicKey', 
    'wallet.address'
  ];
  
  const missing = [];
  
  for (const path of required) {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (!value) {
      missing.push(path);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  return true;
}