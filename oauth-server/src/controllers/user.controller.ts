import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { CryptoService } from "../services/crypto.service.js";
import { createErrorResponse } from "../utils/index.js";

export class UserController {
  private authService: AuthService;
  private cryptoService: CryptoService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.cryptoService = CryptoService.getInstance();
  }

  public userinfo = async (req: Request, res: Response): Promise<Response> => {
    req.useCase = "userinfo";

    try {
      // Extract Bearer token
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        return res.status(401).json(createErrorResponse("invalid_token", "Missing or invalid authorization header"));
      }

      const token = auth.split(" ")[1];
      if (!token) {
        return res.status(401).json(createErrorResponse("invalid_token", "Missing access token"));
      }

      // Verify access token
      const payload = await this.cryptoService.verifyJWT(token, "spa-client");
      
      // Get user info
      const user = await this.authService.getUserByUsername(payload.sub as string);
      if (!user) {
        return res.status(404).json(createErrorResponse("invalid_token", "User not found"));
      }

      // Return user info (claims based on scope)
      const userinfo = {
        sub: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      };

      return res.json(userinfo);
    } catch (error: any) {
      console.error("Userinfo error:", error);
      
      if (error.code === 'ERR_JWT_EXPIRED') {
        return res.status(401).json(createErrorResponse("invalid_token", "Token expired"));
      }
      
      return res.status(401).json(createErrorResponse("invalid_token", "Token verification failed"));
    }
  };
}