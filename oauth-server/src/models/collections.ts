import { MongoClient, Db, Collection } from 'mongodb';
import type { User, Client, AuthCode, RefreshToken } from '../types/index.js';

export class MongoCollections {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  get users(): Collection<User> {
    return this.db.collection<User>('users');
  }

  get clients(): Collection<Client> {
    return this.db.collection<Client>('clients');
  }

  get authCodes(): Collection<AuthCode> {
    return this.db.collection<AuthCode>('authcodes');
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection<RefreshToken>('refreshtokens');
  }

  async createIndexes(): Promise<void> {
    // User indexes
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.users.createIndex({ email: 1 });

    // Client indexes  
    await this.clients.createIndex({ client_id: 1 }, { unique: true });

    // AuthCode indexes
    await this.authCodes.createIndex({ code: 1 }, { unique: true });
    await this.authCodes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

    // RefreshToken indexes
    await this.refreshTokens.createIndex({ token: 1 }, { unique: true });
    await this.refreshTokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await this.refreshTokens.createIndex({ user_id: 1 });

    console.log('✅ Database indexes created');
  }
}