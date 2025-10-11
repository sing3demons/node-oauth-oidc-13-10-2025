import { webcrypto } from "crypto";
import fs from "fs";
import crypto from "crypto";
import { importPKCS8, importSPKI, exportJWK, SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { config } from "../config/index.js";


export class CryptoService {
  private static instance: CryptoService;
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private publicJwk: any = null;
  private jwks: any = null;

  private constructor() {}

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const privatePem = fs.readFileSync(config.keys.privateKeyPath, "utf8");
      const publicPem = fs.readFileSync(config.keys.publicKeyPath, "utf8");

      this.privateKey = await importPKCS8(privatePem, config.jwt.algorithm);
      this.publicKey = await importSPKI(publicPem, config.jwt.algorithm);

      this.publicJwk = await exportJWK(this.publicKey);
      this.publicJwk.kid = config.jwt.kid;
      this.publicJwk.use = "sig";
      this.publicJwk.alg = config.jwt.algorithm;

      this.jwks = createRemoteJWKSet(new URL(`${config.server.issuer}/.well-known/jwks.json`));

      console.log("✅ Crypto service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize crypto service:", error);
      throw error;
    }
  }

  public getPublicJwk() {
    return this.publicJwk;
  }

  public getJWKS() {
    return this.jwks;
  }

  public async signJWT(payload: Record<string, any>, options: {
    audience?: string;
    expiresIn?: string;
    subject?: string;
  } = {}): Promise<string> {
    if (!this.privateKey) {
      throw new Error("Crypto service not initialized");
    }

    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: config.jwt.algorithm, kid: config.jwt.kid })
      .setIssuedAt()
      .setIssuer(config.server.issuer);

    if (options.audience) jwt.setAudience(options.audience);
    if (options.expiresIn) jwt.setExpirationTime(options.expiresIn);
    if (options.subject) jwt.setSubject(options.subject);

    return jwt.sign(this.privateKey);
  }

  public async verifyJWT(token: string, expectedAudience?: string) {
    if (!this.jwks) {
      throw new Error("Crypto service not initialized");
    }

    const verifyOptions: any = { issuer: config.server.issuer };
    if (expectedAudience) {
      verifyOptions.audience = expectedAudience;
    }

    const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
    return payload;
  }

  public createCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    return this.toBase64Url(hash);
  }

  public verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const challenge = this.toBase64Url(hash);
    return challenge === codeChallenge;
  }

  private toBase64Url(buffer: Buffer): string {
    return buffer.toString("base64")
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}