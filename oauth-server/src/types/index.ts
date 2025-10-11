import { Request } from 'express';
import { ObjectId } from 'mongodb';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      sessionId?: string;
      useCase?: string;
    }
  }
}

export interface User {
  _id?: ObjectId;
  username: string;
  password: string;
  name: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Client {
  _id?: ObjectId;
  clientId: string;
  clientSecret?: string;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scopes: string[];
  type: 'public' | 'confidential';
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthCode {
  _id?: ObjectId;
  code: string;
  used: boolean;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface AuthorizationCode {
  _id?: ObjectId;
  code: string;
  clientId: string;
  userId: ObjectId;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  used?: boolean;
  usedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AccessToken {
  _id?: ObjectId;
  token: string;
  clientId: string;
  userId: ObjectId;
  scope: string;
  expiresAt: Date;
  revoked?: boolean;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RefreshToken {
  _id?: ObjectId;
  token: string;
  clientId: string;
  userId: ObjectId;
  accessToken: string;
  expiresAt: Date;
  revoked?: boolean;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Internal camelCase types
export interface AuthorizeQuery {
  responseType?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

// HTTP API snake_case types (for external requests)
export interface AuthorizeQueryHttp {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

// Internal camelCase types
export interface LoginBody {
  username: string;
  password: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
}

// HTTP API snake_case types (for external requests)
export interface LoginBodyHttp {
  username: string;
  password: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method?: string;
}

// Internal camelCase types
export interface TokenRequest {
  grantType: string;
  code?: string;
  clientId?: string;
  redirectUri?: string;
  codeVerifier?: string;
  refreshToken?: string;
}

// HTTP API snake_case types (for external requests)
export interface TokenRequestHttp {
  grant_type: string;
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LogObject {
  timestamp: string;
  service: string;
  version: string;
  inbound: {
    method: string;
    path: string;
    query: any;
    body: any;
    headers: {
      authorization: string;
      host?: string | undefined;
      'user-agent'?: string | undefined;
    };
  };
  outbound: {
    status: number;
    durationMs: number;
    body: any;
    traceId?: string | undefined;
    sessionId?: string | undefined;
  };
  useCase: string;
  traceId?: string | undefined;
  sessionId?: string | undefined;
}