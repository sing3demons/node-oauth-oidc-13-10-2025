import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { UserModel, ClientModel, AuthCodeModel, RefreshTokenModel } from "../models/index.js";
import { CryptoService } from "./crypto.service.js";
import { config } from "../config/index.js";
import type { User, Client } from "../types/index.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
}

export interface AuthCodeData {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
}

export class AuthService {
  private static instance: AuthService;
  private cryptoService: CryptoService;

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // User Authentication
  public async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await UserModel.findOne({ username }).lean();
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  public async getUserById(userId: string): Promise<User | null> {
    return UserModel.findById(userId).lean();
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    return UserModel.findOne({ username }).lean();
  }

  // Client Management
  public async getClientById(clientId: string): Promise<Client | null> {
    return ClientModel.findOne({ client_id: clientId }).lean();
  }

  public async validateClient(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClientById(clientId);
    return client?.redirect_uris.includes(redirectUri) ?? false;
  }

  // Authorization Code Flow
  public async createAuthCode(data: Omit<AuthCodeData, 'code'>): Promise<string> {
    const code = uuidv4();
    
    await AuthCodeModel.create({
      code,
      client_id: data.clientId,
      user_id: data.userId,
      redirect_uri: data.redirectUri,
      scope: data.scope,
      code_challenge: data.codeChallenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    return code;
  }

  public async validateAuthCode(code: string, clientId: string, redirectUri: string): Promise<AuthCodeData | null> {
    const authCode = await AuthCodeModel.findOne({ code }).lean();
    
    if (!authCode) return null;
    if (authCode.expires_at < new Date()) {
      await AuthCodeModel.deleteOne({ code });
      return null;
    }
    if (authCode.client_id !== clientId || authCode.redirect_uri !== redirectUri) {
      return null;
    }

    return {
      code: authCode.code,
      clientId: authCode.client_id,
      userId: authCode.user_id,
      redirectUri: authCode.redirect_uri,
      scope: authCode.scope,
      codeChallenge: authCode.code_challenge
    };
  }

  public async consumeAuthCode(code: string): Promise<void> {
    await AuthCodeModel.deleteOne({ code });
  }

  // Token Management
  public async issueTokens(user: User, clientId: string, scope = "openid profile"): Promise<TokenPair> {
    const accessToken = await this.cryptoService.signJWT(
      { sub: user.username, scope },
      {
        audience: "spa-client", // TODO: Make this configurable
        expiresIn: config.jwt.accessTokenExpiry
      }
    );

    const refreshToken = await this.cryptoService.signJWT(
      { sub: user.username, type: "refresh" },
      {
        expiresIn: config.jwt.refreshTokenExpiry
      }
    );

    // Store refresh token
    await RefreshTokenModel.create({
      user_id: user._id,
      client_id: clientId,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
    });

    const idToken = await this.issueIdToken(user, clientId);

    return {
      accessToken,
      refreshToken,
      idToken
    };
  }

  public async issueIdToken(user: User, clientId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return this.cryptoService.signJWT({
      iss: config.server.issuer,
      aud: clientId,
      sub: String(user._id),
      name: user.name,
      email: user.email,
      iat: now,
      exp: now + 3600,
    });
  }

  public async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    const tokenDoc = await RefreshTokenModel.findOne({ token: refreshToken }).lean();
    
    if (!tokenDoc || tokenDoc.expires_at < new Date() || tokenDoc.revoked) {
      return null;
    }

    const user = await this.getUserById(tokenDoc.user_id);
    if (!user) return null;

    // Revoke old refresh token
    await RefreshTokenModel.deleteOne({ token: refreshToken });

    // Issue new tokens
    return this.issueTokens(user, tokenDoc.client_id);
  }

  public async revokeToken(token: string): Promise<boolean> {
    const result = await RefreshTokenModel.deleteOne({ token });
    return result.deletedCount > 0;
  }

  // PKCE Validation
  public validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
    return this.cryptoService.verifyCodeChallenge(codeVerifier, codeChallenge);
  }
}