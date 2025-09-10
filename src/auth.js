import crypto from 'crypto';
import secp256k1 from 'secp256k1';

export class GalaAuth {
  constructor(privateKey, publicKey, walletAddress) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.walletAddress = walletAddress;
  }

  generateUniqueKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  signRequest(requestBody) {
    const message = typeof requestBody === 'string' 
      ? requestBody 
      : JSON.stringify(requestBody);
    
    const messageHash = crypto.createHash('sha256').update(message).digest();
    
    const signature = secp256k1.ecdsaSign(messageHash, Buffer.from(this.privateKey, 'hex'));
    
    return Buffer.from(signature.signature).toString('hex');
  }

  getAuthHeaders(requestBody) {
    const signature = this.signRequest(requestBody);
    
    return {
      'X-Wallet-Address': this.walletAddress,
      'Content-Type': 'application/json',
      'X-Signature': signature
    };
  }

  prepareRequestBody(data) {
    return {
      ...data,
      signerPublicKey: this.publicKey,
      uniqueKey: this.generateUniqueKey()
    };
  }
}