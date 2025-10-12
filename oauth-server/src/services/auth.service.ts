import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import type { Request } from "express";
import { UserModel, ClientModel, AuthCodeModel, RefreshTokenModel } from "../models/index.js";
import { CryptoService } from "./crypto.service.js";
import { config } from "../config/index.js";
import type { User, Client } from "../types/index.js";
import { LoggerAction, SubActionEnum } from "../logger/types.js";

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
    const user = await UserModel.findOne({ username });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  public async getUserById(userId: string): Promise<User | null> {
    return UserModel.findById(userId);
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    return UserModel.findOne({ username });
  }

  // private getCommandLog(method: string, searchItem: Record<string, any> = {}): string {
  //   const rawData = `${this.collectionName}.${method}(${JSON.stringify(
  //     searchItem
  //   ).replace(/"/g, "'")})`;
  //   return rawData;
  // }

  // Client Management
  public async getClientById(ctx: Request, clientId: string): Promise<Client | null> {
    const start = Date.now();
    const rawData = `clients.findOne({ clientId: '${clientId}' })`;
    ctx.logger.info(LoggerAction.DB_REQUEST(`mongo findOne clients`, SubActionEnum.READ), rawData);

    try {
      const result = await ClientModel.findOne({ clientId: clientId });
      ctx.logger.info(LoggerAction.DB_RESPONSE(`mongo findOne clients`, SubActionEnum.READ), { result, duration: Date.now() - start });
      return result;
      
    } catch (error) {
      ctx.logger.error(LoggerAction.DB_RESPONSE(`mongo findOne clients`, SubActionEnum.READ), { error, duration: Date.now() - start });
    }
    return null;
  }

  public async validateClient(ctx: Request, clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClientById(ctx, clientId);
    return client?.redirectUris?.includes(redirectUri) ?? false;
  }

  // Authorization Code Flow
  public async createAuthCode(data: Omit<AuthCodeData, 'code'>): Promise<string> {
    const code = uuidv4();

    await AuthCodeModel.create({
      code,
      used: false,
      clientId: data.clientId,
      userId: new ObjectId(data.userId),
      redirectUri: data.redirectUri,
      scope: data.scope,
      codeChallenge: data.codeChallenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    return code;
  }

  public async validateAuthCode(code: string, clientId: string, redirectUri: string): Promise<AuthCodeData | null> {
    const authCode = await AuthCodeModel.findOne({ code });

    if (!authCode) return null;
    if (authCode.expiresAt < new Date()) {
      await AuthCodeModel.deleteOne({ code });
      return null;
    }
    if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
      return null;
    }

    return {
      code: authCode.code,
      clientId: authCode.clientId,
      userId: authCode.userId.toString(),
      redirectUri: authCode.redirectUri,
      scope: authCode.scope,
      codeChallenge: authCode.codeChallenge || ''
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
      userId: user._id || new ObjectId(),
      clientId: clientId,
      token: refreshToken,
      accessToken: accessToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
      revoked: false
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
    const tokenDoc = await RefreshTokenModel.findOne({ token: refreshToken });

    if (!tokenDoc || tokenDoc.expiresAt < new Date() || tokenDoc.revoked) {
      return null;
    }

    const user = await this.getUserById(tokenDoc.userId.toString());
    if (!user) return null;

    // Revoke old refresh token
    await RefreshTokenModel.deleteOne({ token: refreshToken });

    // Issue new tokens
    return this.issueTokens(user, tokenDoc.clientId);
  }

  public async revokeToken(token: string): Promise<boolean> {
    const result = await RefreshTokenModel.deleteOne({ token });
    return result;
  }

  // PKCE Validation
  public validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
    return this.cryptoService.verifyCodeChallenge(codeVerifier, codeChallenge);
  }
}