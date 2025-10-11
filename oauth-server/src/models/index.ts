import { ObjectId, Collection } from "mongodb";
import { DatabaseService } from "../services/database.service.js";
import type { User, Client, AuthCode, RefreshToken } from "../types/index.js";

export class UserRepository {
  private get collection(): Collection<User> {
    const db = DatabaseService.getInstance();
    return db.getCollections().users;
  }

  async findOne(filter: Partial<User>): Promise<User | null> {
    return this.collection.findOne(filter);
  }

  async findById(id: string | ObjectId): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: objectId });
  }

  async create(user: Omit<User, '_id'>): Promise<User> {
    const now = new Date();
    const result = await this.collection.insertOne({
      ...user,
      createdAt: now,
      updatedAt: now
    } as User);
    
    return { ...user, _id: result.insertedId } as User;
  }

  async updateOne(filter: Partial<User>, update: Partial<User>): Promise<boolean> {
    const result = await this.collection.updateOne(filter, { 
      $set: { ...update, updatedAt: new Date() } 
    });
    return result.modifiedCount > 0;
  }

  async deleteMany(filter: Partial<User>): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }
}

export class ClientRepository {
  private get collection(): Collection<Client> {
    const db = DatabaseService.getInstance();
    return db.getCollections().clients;
  }

  async findOne(filter: Partial<Client>): Promise<Client | null> {
    return this.collection.findOne(filter);
  }

  async create(client: Omit<Client, '_id'>): Promise<Client> {
    const result = await this.collection.insertOne({
      ...client,
      createdAt: new Date()
    } as Client);
    
    return { ...client, _id: result.insertedId } as Client;
  }

  async deleteMany(filter: Partial<Client>): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }
}

export class AuthCodeRepository {
  private get collection(): Collection<AuthCode> {
    const db = DatabaseService.getInstance();
    return db.getCollections().authCodes;
  }

  async findOne(filter: Partial<AuthCode>): Promise<AuthCode | null> {
    return this.collection.findOne(filter);
  }

  async create(authCode: Omit<AuthCode, '_id'>): Promise<AuthCode> {
    const result = await this.collection.insertOne({
      ...authCode,
      createdAt: new Date()
    } as AuthCode);
    
    return { ...authCode, _id: result.insertedId } as AuthCode;
  }

  async deleteOne(filter: Partial<AuthCode>): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }
}

export class RefreshTokenRepository {
  private get collection(): Collection<RefreshToken> {
    const db = DatabaseService.getInstance();
    return db.getCollections().refreshTokens;
  }

  async findOne(filter: Partial<RefreshToken>): Promise<RefreshToken | null> {
    return this.collection.findOne(filter);
  }

  async create(refreshToken: Omit<RefreshToken, '_id'>): Promise<RefreshToken> {
    const result = await this.collection.insertOne({
      ...refreshToken,
      createdAt: new Date()
    } as RefreshToken);
    
    return { ...refreshToken, _id: result.insertedId } as RefreshToken;
  }

  async deleteOne(filter: Partial<RefreshToken>): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }
}

// Export instances for backward compatibility
export const UserModel = new UserRepository();
export const ClientModel = new ClientRepository();
export const AuthCodeModel = new AuthCodeRepository();
export const RefreshTokenModel = new RefreshTokenRepository();