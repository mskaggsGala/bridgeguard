import fetch from 'node-fetch';
import { GalaAuth } from './auth.js';

export class GalaBridgeClient {
  constructor(privateKey, publicKey, walletAddress) {
    this.baseUrl = 'https://dex-backend-prod1.defi.gala.com';
    this.auth = new GalaAuth(privateKey, publicKey, walletAddress);
    this.rateLimitDelay = 500; // 500ms between requests to respect rate limits
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    await this.delay(this.rateLimitDelay);
    
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const requestBody = this.auth.prepareRequestBody(data);
      options.body = JSON.stringify(requestBody);
      options.headers = {
        ...options.headers,
        ...this.auth.getAuthHeaders(requestBody)
      };
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(result)}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // Token Balance Operations  
  async getTokenBalance(tokenClass, tokenInstance = '0') {
    const data = {
      owner: this.auth.walletAddress,
      collection: tokenClass,
      category: 'Unit',
      type: 'none',
      additionalKey: 'none',
      instance: tokenInstance
    };
    return await this.makeRequest('/galachain/api/asset/token-contract/FetchBalances', 'POST', data);
  }

  async getAllTokenBalances() {
    const data = {
      owner: this.auth.walletAddress
    };
    return await this.makeRequest('/galachain/api/asset/token-contract/FetchBalances', 'POST', data);
  }

  // Bridge Operations
  async getBridgeConfigurations(searchPrefix = null) {
    const endpoint = searchPrefix 
      ? `/v1/connect/bridge-configurations?searchprefix=${encodeURIComponent(searchPrefix)}`
      : '/v1/connect/bridge-configurations';
    return await this.makeRequest(endpoint);
  }

  async requestBridge(walletAddress, destinationChainId, recipient, quantity, token) {
    const data = {
      walletAddress,
      destinationChainId,
      recipient,
      quantity,
      token
    };
    return await this.makeRequest('/v1/connect/bridge/request', 'POST', data);
  }

  async requestTokenBridgeOut(bridgeRequestData) {
    return await this.makeRequest('/v1/connect/RequestTokenBridgeOut', 'POST', bridgeRequestData);
  }

  async bridgeTokenOut(bridgeFromChannel, bridgeRequestId, signature) {
    const data = {
      bridgeFromChannel,
      bridgeRequestId,
      signature
    };
    return await this.makeRequest('/v1/connect/BridgeTokenOut', 'POST', data);
  }

  async getBridgeStatus(hash) {
    const data = { hash };
    return await this.makeRequest('/v1/connect/bridge/status', 'POST', data);
  }

  // Swap Operations (for testing bridge functionality)
  async getAvailableSwaps() {
    return await this.makeRequest('/api/swap/available');
  }

  async createSwap(offered, wanted, uses) {
    const data = {
      offered,
      wanted,
      uses: uses.toString()
    };
    return await this.makeRequest('/api/swap/create', 'POST', data);
  }

  async acceptSwap(swapId) {
    const data = { swapId };
    return await this.makeRequest('/api/swap/accept', 'POST', data);
  }

  async cancelSwap(swapId) {
    const data = { swapId };
    return await this.makeRequest('/api/swap/cancel', 'POST', data);
  }

  // Wallet Operations
  async getWalletInfo() {
    // For GalaConnect, wallet info can be derived from successful balance queries
    // This is a simplified implementation that verifies wallet connectivity
    try {
      const balances = await this.getAllTokenBalances();
      return {
        walletAddress: this.auth.walletAddress,
        connected: true,
        balances: balances
      };
    } catch (error) {
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  async checkTokenAllowance(tokenClass, spenderAddress) {
    // Token allowance checking would be done through GalaChain token contract
    // This is a placeholder for the actual implementation
    console.log(`Token allowance check requested for ${tokenClass} and spender ${spenderAddress}`);
    throw new Error('Token allowance checking not yet implemented for GalaConnect API');
  }
}