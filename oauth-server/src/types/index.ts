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
  client_id: string;
  redirect_uris: string[];
  type: string;
  createdAt?: Date;
}

export interface AuthCode {
  _id?: ObjectId;
  code: string;
  used: boolean;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  expires_at: Date;
  createdAt?: Date;
}

export interface RefreshToken {
  _id?: ObjectId;
  token: string;
  user_id: string;
  client_id: string;
  expires_at: Date;
  revoked: boolean;
  createdAt?: Date;
}

export interface AuthorizeQuery {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface LoginBody {
  username: string;
  password: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method?: string;
}

export interface TokenRequest {
  grant_type: string;
  code?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
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
    duration_ms: number;
    body: any;
    trace_id?: string | undefined;
    session_id?: string | undefined;
  };
  useCase: string;
  trace_id?: string | undefined;
  session_id?: string | undefined;
}