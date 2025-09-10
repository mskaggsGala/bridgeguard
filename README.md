# BridgeGuard 🌉

A comprehensive testing bot for the GalaChain bridge system. This bot validates bridge functionality, monitors API endpoints, and ensures proper operation of token bridging between channels.

## Features

- 🔐 **Secure Authentication**: Implements proper cryptographic signing for GalaChain API
- 🧪 **Comprehensive Testing**: Tests wallet connectivity, token balances, bridge operations, and swap functionality
- 📊 **Detailed Reporting**: Provides extensive logging and test result summaries
- ⚡ **Rate Limited**: Respects API rate limits with configurable delays
- 🔧 **Configurable**: Environment-based configuration for different testing scenarios

## Quick Start

1. **Clone and Install**
   ```bash
   cd ~/Documents/Projects/bridgeguard
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your wallet credentials
   ```

3. **Run Basic Tests**
   ```bash
   npm start
   ```

## Configuration

### Required Settings (.env)
```bash
PRIVATE_KEY=your_private_key_here
PUBLIC_KEY=your_public_key_here  
WALLET_ADDRESS=your_wallet_address_here
```

### Optional Bridge Testing
```bash
RUN_BRIDGE_TESTS=true
TEST_TOKEN_CLASS=MUSIC
TEST_AMOUNT=1
TEST_RECIPIENT=your_ethereum_wallet_address
```

## Available Tests

### Functional Tests
- **Wallet Connection**: Validates API connectivity and authentication
- **Token Balances**: Checks GALA and MUSIC token balances
- **Bridge Configurations**: Retrieves bridge system information and supported networks
- **Available Swaps**: Lists current swap opportunities
- **Bridge Flow**: Bridge request testing to Ethereum (optional)

### Security Tests
- **Signature Validation**: Tests cryptographic signature security
- **Replay Attack Protection**: Validates against signature and transaction replay
- **Rate Limiting**: Tests DoS protection and resource exhaustion
- **Access Control**: Validates authorization mechanisms
- **Double Spending**: Tests for bridge-specific exploit prevention
- **Invalid Token Protection**: Tests token validation security

## Usage

### Run Functional Tests
```bash
npm start
```

### Run Security Tests (Recommended)
```bash
npm run security
```

### Run Public API Tests (No Wallet Required)
```bash
npm run public-test
```

### Development Mode (with auto-restart)
```bash
npm run dev
```

## API Coverage

This bot tests the following GalaConnect API endpoints:
- `/galachain/api/asset/token-contract/FetchBalances` - Token balance queries
- `/v1/connect/bridge-configurations` - Bridge system configuration
- `/v1/connect/bridge/request` - Bridge request generation
- `/v1/connect/RequestTokenBridgeOut` - Bridge transaction submission
- `/v1/connect/BridgeTokenOut` - Bridge token execution
- `/v1/connect/bridge/status` - Bridge transaction monitoring
- `/api/swap/available` - Available swap listings

## Security

### Built-in Security Features
- Private keys are loaded from environment variables only
- All requests are cryptographically signed using secp256k1
- Unique keys prevent replay attacks
- No sensitive data is logged or stored

### Comprehensive Security Testing
BridgeGuard includes extensive security testing based on analysis of major bridge exploits:
- **Historical Exploit Analysis**: Tests against vulnerabilities from Ronin ($624M), Wormhole ($326M), Poly Network ($611M)
- **Signature Security**: Validates against replay attacks, malleability, and format manipulation
- **DoS Protection**: Tests rate limiting and resource exhaustion protection
- **Access Control**: Validates authorization and privilege escalation prevention
- **Bridge-Specific Exploits**: Tests double spending, invalid tokens, and cross-chain replay attacks

**Security Test Results**: 
- ✅ **PASS**: Bridge is secure for production use
- ⚠️ **WARN**: Minor issues found, review recommended  
- 🚨 **FAIL**: Critical vulnerabilities detected, DO NOT USE IN PRODUCTION

## Rate Limiting

The bot automatically handles GalaChain's rate limits:
- 20 requests per 10 seconds maximum
- Configurable delay between requests (default: 500ms)
- Automatic backoff on rate limit errors

## Error Handling

- Comprehensive error logging with timestamps
- Graceful handling of API failures
- Detailed error messages for debugging
- Non-zero exit codes for CI/CD integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details