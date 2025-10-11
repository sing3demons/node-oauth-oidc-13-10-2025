import { Request, Response } from "express";
import { CryptoService } from "../services/crypto.service.js";
import { config } from "../config/index.js";

export class DiscoveryController {
  private cryptoService: CryptoService;

  constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  public getOpenIdConfiguration = (req: Request, res: Response): void => {
    req.useCase = "discovery";
    
    const configuration = {
      issuer: config.server.issuer,
      authorization_endpoint: `${config.server.issuer}/authorize`,
      token_endpoint: `${config.server.issuer}/token`,
      userinfo_endpoint: `${config.server.issuer}/userinfo`,
      revocation_endpoint: `${config.server.issuer}/revoke`,
      jwks_uri: `${config.server.issuer}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: [config.jwt.algorithm],
      scopes_supported: ["openid", "profile", "email"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      claims_supported: ["sub", "name", "email", "iat", "exp", "aud", "iss"]
    };

    res.json(configuration);
  };

  public getJwks = (req: Request, res: Response): void => {
    req.useCase = "jwks";
    
    const publicJwk = this.cryptoService.getPublicJwk();
    
    res.set("Cache-Control", "public, max-age=300");
    res.json({ keys: [publicJwk] });
  };
}