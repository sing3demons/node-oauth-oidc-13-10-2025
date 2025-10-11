import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { createErrorResponse } from "../utils/index.js";
import type { TokenRequestHttp, TokenResponse } from "../types/index.js";

export class TokenController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  public token = async (req: Request<{}, TokenResponse | { error: string; error_description?: string }, TokenRequestHttp>, res: Response): Promise<Response> => {
    req.useCase = "token";
    
    const { grant_type } = req.body;

    try {
      if (grant_type === "authorization_code") {
        return await this.handleAuthorizationCode(req, res);
      }

      if (grant_type === "refresh_token") {
        return await this.handleRefreshToken(req, res);
      }

      return res.status(400).json(createErrorResponse("unsupported_grant_type"));
    } catch (error) {
      console.error("Token endpoint error:", error);
      return res.status(500).json(createErrorResponse("server_error"));
    }
  };

  private async handleAuthorizationCode(req: Request, res: Response): Promise<Response> {
    const { code, client_id, redirect_uri, code_verifier } = req.body;

    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return res.status(400).json(createErrorResponse("invalid_request", "Missing required parameters"));
    }

    // Validate authorization code
    const authCodeData = await this.authService.validateAuthCode(code, client_id, redirect_uri);
    if (!authCodeData) {
      return res.status(400).json(createErrorResponse("invalid_grant"));
    }

    // Validate PKCE
    const isPKCEValid = this.authService.validatePKCE(code_verifier, authCodeData.codeChallenge);
    if (!isPKCEValid) {
      return res.status(400).json(createErrorResponse("invalid_grant", "PKCE verification failed"));
    }

    // Get user
    const user = await this.authService.getUserById(authCodeData.userId);
    if (!user) {
      return res.status(400).json(createErrorResponse("invalid_grant", "User not found"));
    }

    // Issue tokens
    const tokens = await this.authService.issueTokens(user, client_id);
    
    // Consume authorization code
    await this.authService.consumeAuthCode(code);

    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      id_token: tokens.idToken!,
      token_type: "Bearer",
      expires_in: 900 // 15 minutes
    });
  }

  private async handleRefreshToken(req: Request, res: Response): Promise<Response> {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json(createErrorResponse("invalid_request", "Missing refresh_token"));
    }

    // Refresh tokens
    const tokens = await this.authService.refreshTokens(refresh_token);
    if (!tokens) {
      return res.status(400).json(createErrorResponse("invalid_grant", "Invalid or expired refresh token"));
    }

    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      id_token: tokens.idToken!,
      token_type: "Bearer",
      expires_in: 900
    });
  }

  public revoke = async (req: Request, res: Response): Promise<Response> => {
    req.useCase = "revoke";
    
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(createErrorResponse("invalid_request", "Missing token"));
    }

    const revoked = await this.authService.revokeToken(token);
    
    return res.json({ revoked });
  };
}