import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository.js';
import { User, Client, AuthorizationCode, AccessToken, RefreshToken } from '../types/index.js';

// User Repository
export class UserRepository extends BaseRepository<User> {
  protected collectionName = 'users';

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ username });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.exists({ username });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.exists({ email });
  }
}

// Client Repository  
export class ClientRepository extends BaseRepository<Client> {
  protected collectionName = 'clients';

  async findByClientId(clientId: string): Promise<Client | null> {
    return this.findOne({ clientId });
  }

  async findByClientIdAndSecret(clientId: string, clientSecret: string): Promise<Client | null> {
    return this.findOne({ clientId, clientSecret });
  }

  async existsByClientId(clientId: string): Promise<boolean> {
    return this.exists({ clientId });
  }

  async findActiveByClientId(clientId: string): Promise<Client | null> {
    return this.findOne({ 
      clientId, 
      active: true 
    });
  }
}

// Authorization Code Repository
export class AuthorizationCodeRepository extends BaseRepository<AuthorizationCode> {
  protected collectionName = 'authorization_codes';

  async findByCode(code: string): Promise<AuthorizationCode | null> {
    return this.findOne({ code });
  }

  async findValidCode(code: string): Promise<AuthorizationCode | null> {
    const now = new Date();
    return this.findOne({
      code,
      expiresAt: { $gt: now },
      used: { $ne: true }
    });
  }

  async markAsUsed(code: string): Promise<boolean> {
    return this.updateOne(
      { code },
      { 
        $set: { 
          used: true,
          usedAt: new Date()
        }
      }
    );
  }

  async deleteExpiredCodes(): Promise<number> {
    const now = new Date();
    return this.deleteMany({
      expiresAt: { $lt: now }
    });
  }

  async findByClientAndUser(clientId: string, userId: string): Promise<AuthorizationCode[]> {
    return this.find({
      clientId,
      userId: new ObjectId(userId)
    });
  }
}

// Access Token Repository
export class AccessTokenRepository extends BaseRepository<AccessToken> {
  protected collectionName = 'access_tokens';

  async findByToken(token: string): Promise<AccessToken | null> {
    return this.findOne({ token });
  }

  async findValidToken(token: string): Promise<AccessToken | null> {
    const now = new Date();
    return this.findOne({
      token,
      expiresAt: { $gt: now },
      revoked: { $ne: true }
    });
  }

  async revokeToken(token: string): Promise<boolean> {
    return this.updateOne(
      { token },
      { 
        $set: { 
          revoked: true,
          revokedAt: new Date()
        }
      }
    );
  }

  async revokeByClientAndUser(clientId: string, userId: string): Promise<number> {
    return this.updateMany(
      {
        clientId,
        userId: new ObjectId(userId),
        revoked: { $ne: true }
      },
      { 
        $set: { 
          revoked: true,
          revokedAt: new Date()
        }
      }
    );
  }

  async deleteExpiredTokens(): Promise<number> {
    const now = new Date();
    return this.deleteMany({
      expiresAt: { $lt: now }
    });
  }

  async findActiveByClientAndUser(clientId: string, userId: string): Promise<AccessToken[]> {
    const now = new Date();
    return this.find({
      clientId,
      userId: new ObjectId(userId),
      expiresAt: { $gt: now },
      revoked: { $ne: true }
    });
  }
}

// Refresh Token Repository
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  protected collectionName = 'refresh_tokens';

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findOne({ token });
  }

  async findValidToken(token: string): Promise<RefreshToken | null> {
    const now = new Date();
    return this.findOne({
      token,
      expiresAt: { $gt: now },
      revoked: { $ne: true }
    });
  }

  async revokeToken(token: string): Promise<boolean> {
    return this.updateOne(
      { token },
      { 
        $set: { 
          revoked: true,
          revokedAt: new Date()
        }
      }
    );
  }

  async revokeByAccessToken(accessToken: string): Promise<boolean> {
    return this.updateOne(
      { accessToken },
      { 
        $set: { 
          revoked: true,
          revokedAt: new Date()
        }
      }
    );
  }

  async revokeByClientAndUser(clientId: string, userId: string): Promise<number> {
    return this.updateMany(
      {
        clientId,
        userId: new ObjectId(userId),
        revoked: { $ne: true }
      },
      { 
        $set: { 
          revoked: true,
          revokedAt: new Date()
        }
      }
    );
  }

  async deleteExpiredTokens(): Promise<number> {
    const now = new Date();
    return this.deleteMany({
      expiresAt: { $lt: now }
    });
  }

  async findByAccessToken(accessToken: string): Promise<RefreshToken | null> {
    return this.findOne({ accessToken });
  }
}

// Repository Factory
export class RepositoryFactory {
  private static userRepository: UserRepository;
  private static clientRepository: ClientRepository;
  private static authCodeRepository: AuthorizationCodeRepository;
  private static accessTokenRepository: AccessTokenRepository;
  private static refreshTokenRepository: RefreshTokenRepository;

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  static getClientRepository(): ClientRepository {
    if (!this.clientRepository) {
      this.clientRepository = new ClientRepository();
    }
    return this.clientRepository;
  }

  static getAuthCodeRepository(): AuthorizationCodeRepository {
    if (!this.authCodeRepository) {
      this.authCodeRepository = new AuthorizationCodeRepository();
    }
    return this.authCodeRepository;
  }

  static getAccessTokenRepository(): AccessTokenRepository {
    if (!this.accessTokenRepository) {
      this.accessTokenRepository = new AccessTokenRepository();
    }
    return this.accessTokenRepository;
  }

  static getRefreshTokenRepository(): RefreshTokenRepository {
    if (!this.refreshTokenRepository) {
      this.refreshTokenRepository = new RefreshTokenRepository();
    }
    return this.refreshTokenRepository;
  }
}