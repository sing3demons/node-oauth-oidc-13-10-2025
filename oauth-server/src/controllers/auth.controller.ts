import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { createErrorResponse } from "../utils/index.js";
import type { AuthorizeQueryHttp, LoginBodyHttp } from "../types/index.js";

// Utility function to escape HTML
function escapeHtml(unsafe: string | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  public authorize = async (req: Request<{}, any, any, AuthorizeQueryHttp>, res: Response): Promise<Response | void> => {
    req.useCase = "authorize";
    
    // Extract from HTTP query (snake_case) and convert to camelCase
    const { 
      response_type, 
      client_id, 
      redirect_uri, 
      scope, 
      state, 
      code_challenge, 
      code_challenge_method 
    } = req.query;

    // Convert to camelCase for internal use
    const responseType = response_type as string;
    const clientId = client_id as string;
    const redirectUri = redirect_uri as string;
    const codeChallenge = code_challenge as string;
    const codeChallengeMethod = code_challenge_method as string;

    // Validate required parameters
    if (!clientId || !redirectUri) {
      return res.status(400).json(createErrorResponse("invalid_request", "Missing required parameters"));
    }

    // Validate response type
    if (responseType !== "code") {
      return res.status(400).json(createErrorResponse("unsupported_response_type"));
    }

    // Validate PKCE
    if (!codeChallenge || codeChallengeMethod !== "S256") {
      return res.status(400).json(createErrorResponse("invalid_request", "PKCE required (S256)"));
    }

    // Validate client
    const isValidClient = await this.authService.validateClient(clientId, redirectUri);
    if (!isValidClient) {
      return res.status(400).json(createErrorResponse("invalid_client"));
    }

    // Render login form
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OAuth Login</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          input[type="text"], input[type="password"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .demo-info { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 15px; font-size: 14px; }
        </style>
      </head>
      <body>
        <h2>Login to authorize ${escapeHtml(client_id)}</h2>
        <form method="post" action="/login">
          <div class="form-group">
            <input name="username" placeholder="Username" required />
          </div>
          <div class="form-group">
            <input name="password" type="password" placeholder="Password" required />
          </div>
          <input type="hidden" name="client_id" value="${escapeHtml(client_id)}" />
          <input type="hidden" name="redirect_uri" value="${escapeHtml(redirect_uri)}" />
          <input type="hidden" name="state" value="${escapeHtml(state || "")}" />
          <input type="hidden" name="scope" value="${escapeHtml(scope || "")}" />
          <input type="hidden" name="code_challenge" value="${escapeHtml(code_challenge)}" />
          <input type="hidden" name="code_challenge_method" value="${escapeHtml(code_challenge_method || "")}" />
          <button type="submit">Login & Authorize</button>
        </form>
        <div class="demo-info">
          <strong>Demo Credentials:</strong><br>
          Username: <code>alice</code><br>
          Password: <code>password</code>
        </div>
      </body>
      </html>
    `);
  };

  public login = async (req: Request<{}, any, LoginBodyHttp>, res: Response): Promise<Response | void> => {
    req.useCase = "login";
    
    const { username, password, client_id, redirect_uri, scope, state, code_challenge } = req.body;

    // Validate user credentials
    const user = await this.authService.authenticateUser(username, password);
    if (!user) {
      return res.status(401).send(`
        <html>
          <body>
            <h2>Invalid Credentials</h2>
            <p>The username or password you entered is incorrect.</p>
            <a href="/authorize?${new URLSearchParams(req.body as any).toString()}">Try again</a>
          </body>
        </html>
      `);
    }

    // Create authorization code
    const code = await this.authService.createAuthCode({
      clientId: client_id,
      userId: String(user._id),
      redirectUri: redirect_uri,
      scope: scope || "",
      codeChallenge: code_challenge
    });

    // Redirect back to client
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    res.redirect(redirectUrl.toString());
  };
}