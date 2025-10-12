import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { createErrorResponse } from "../utils/index.js";
import type { AuthorizeQueryHttp, LoginBodyHttp } from "../types/index.js";
import { validate } from "../utils/validation.js";
import z, { ZodAny } from "zod";

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

const schemaAuthorize = z.object({
  response_type: z.string().min(2).max(100),
  client_id: z.string().min(2).max(100),
  redirect_uri: z.string(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().min(43).max(128).optional(),
  code_challenge_method: z.enum(["S256", "plain"]).optional()
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  public authorize = async (req: Request, res: Response): Promise<Response | void> => {
    req.logger.init("authorize");

    // Extract from HTTP query (snake_case) and convert to camelCase
    const validateReq = validate(schemaAuthorize, req.query);
    if (!validateReq.success) {
      req.logger.addSummaryMetadata("error", validateReq.desc);
      return res.status(400).json(createErrorResponse("invalid_request", "Missing or invalid parameters"));
    }

    // Convert to camelCase for internal use
    const responseType = validateReq.data.response_type as string;
    const clientId = validateReq.data.client_id;
    const redirectUri = validateReq.data.redirect_uri as string;
    const codeChallenge = validateReq.data.code_challenge as string;
    const codeChallengeMethod = validateReq.data.code_challenge_method as string;

    // Validate response type
    if (responseType !== "code") {
      return res.status(400).json(createErrorResponse("unsupported_response_type"));
    }

    // Validate PKCE
    if (!codeChallenge || codeChallengeMethod !== "S256") {
      return res.status(400).json(createErrorResponse("invalid_request", "PKCE required (S256)"));
    }

    // Validate client
    const isValidClient = await this.authService.validateClient(req, clientId, redirectUri);
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
        <h2>Login to authorize ${escapeHtml(clientId)}</h2>
        <form method="post" action="/login">
          <div class="form-group">
            <input name="username" placeholder="Username" required />
          </div>
          <div class="form-group">
            <input name="password" type="password" placeholder="Password" required />
          </div>
          <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
          <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
          <input type="hidden" name="state" value="${escapeHtml(validateReq.data.state || "")}" />
          <input type="hidden" name="scope" value="${escapeHtml(validateReq.data.scope || "")}" />
          <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
          <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod || "")}" />
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