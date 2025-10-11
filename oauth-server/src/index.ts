import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createRemoteJWKSet, exportJWK, jwtVerify, importPKCS8, importSPKI, SignJWT } from "jose";
import { logMiddleware, traceIdMiddleware } from "./middleware.js";
import { UserModel, ClientModel, AuthCodeModel, RefreshTokenModel } from "./models/index.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import type {
    User,
    AuthorizeQuery,
    LoginBody,
    TokenRequest,
    TokenResponse
} from "./types/index.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get service name and version set to environment
try {
    const pkgPath = join(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || pkg.name || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || pkg.version || "unknown";
} catch (e) {
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || "unknown";
}

const MONGO = process.env.MONGO ?? "mongodb://localhost:27017/oauth_demo";
await mongoose.connect(MONGO);
console.log("Auth DB:", MONGO);

// ===== Keypair Setup =====
const KID = "demo-key";
const keysPath = join(__dirname, "../keys");
const privatePem = fs.readFileSync(join(keysPath, "private.pem"), "utf8");
const publicPem = fs.readFileSync(join(keysPath, "public.pem"), "utf8");

const privateKey = await importPKCS8(privatePem, "RS256");
const publicKey = await importSPKI(publicPem, "RS256");

const publicJwk = await exportJWK(publicKey);
publicJwk.kid = KID;
publicJwk.use = "sig";
publicJwk.alg = "RS256";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
    origin: '*',
}));
// TraceId middleware
app.use(traceIdMiddleware);
app.use(logMiddleware);

const ISSUER = "http://localhost:4000";

function esc(s?: string): string {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const toBase64Url = (buf: Buffer): string =>
    buf.toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Helper: issue access_token + refresh_token
async function issueTokens(user: User, client_id: string, scope = "openid profile"): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await new SignJWT({ sub: user.username, scope })
        .setProtectedHeader({ alg: "RS256", kid: KID })
        .setIssuedAt()
        .setIssuer("http://localhost:4000")
        .setAudience("http://localhost:5000")
        .setExpirationTime("15m")
        .sign(privateKey);

    const refreshToken = await new SignJWT({ sub: user.username, type: "refresh" })
        .setProtectedHeader({ alg: "RS256", kid: KID })
        .setIssuedAt()
        .setIssuer("http://localhost:4000")
        .setExpirationTime("7d")
        .sign(privateKey);

    await RefreshTokenModel.create({
        user_id: user._id,
        client_id: client_id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    return { accessToken, refreshToken };
}

// Issue id_token
async function issueIdToken(user: User, client_id: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({
        iss: "http://localhost:4000",
        aud: client_id,
        sub: String(user._id),
        name: user.name,
        email: user.email,
        iat: now,
        exp: now + 3600,
    })
        .setProtectedHeader({ alg: "RS256", kid: KID })
        .sign(privateKey);
}

// Discovery & JWKS
app.get("/.well-known/openid-configuration", (req: Request, res: Response) => {
    req.useCase = "discovery";
    res.json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        userinfo_endpoint: `${ISSUER}/userinfo`,
        revocation_endpoint: `${ISSUER}/revoke`,
        jwks_uri: `${ISSUER}/.well-known/jwks.json`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"]
    });
});

app.get("/.well-known/jwks.json", (req: Request, res: Response) => {
    req.useCase = "jwks";
    res.set("Cache-Control", "public, max-age=300");
    res.json({ keys: [publicJwk] });
});

// /authorize (show login form) — require PKCE
app.get("/authorize", async (req: Request<{}, any, any, AuthorizeQuery>, res: Response): Promise<Response | void> => {
    req.useCase = "authorize";
    const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } = req.query;
    
    if (!client_id || !redirect_uri) {
        return res.status(400).send("Missing required parameters");
    }
    
    const client = await ClientModel.findOne({ client_id });
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
        return res.status(400).send("invalid_client");
    }
    if (response_type !== "code") {
        return res.status(400).send("unsupported_response_type");
    }
    if (!code_challenge || code_challenge_method !== "S256") {
        return res.status(400).send("PKCE required (S256)");
    }

    res.send(`
    <h3>Login to authorize ${esc(client_id)}</h3>
    <form method="post" action="/login">
      <input name="username" placeholder="username"/><br/>
      <input name="password" placeholder="password" type="password"/><br/>
      <input type="hidden" name="client_id" value="${esc(client_id)}"/>
      <input type="hidden" name="redirect_uri" value="${esc(redirect_uri)}"/>
      <input type="hidden" name="state" value="${esc(state || "")}"/>
      <input type="hidden" name="scope" value="${esc(scope || "")}"/>
      <input type="hidden" name="code_challenge" value="${esc(code_challenge)}"/>
      <input type="hidden" name="code_challenge_method" value="${esc(code_challenge_method)}"/>
      <button type="submit">Login</button>
    </form>
    <p>Demo: user <b>alice</b> / password <b>password</b></p>
  `);
});

// /login => validate, create auth code
app.post("/login", async (req: Request<{}, any, LoginBody>, res: Response): Promise<Response | void> => {
    req.useCase = "login";
    const { username, password, client_id, redirect_uri, scope, state, code_challenge } = req.body;
    
    const user = await UserModel.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("invalid credentials");
    }

    const code = uuidv4();
    await AuthCodeModel.create({
        code,
        client_id,
        used: false,
        user_id: String(user._id),
        redirect_uri,
        scope: scope || "",
        code_challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    const uri = new URL(redirect_uri);
    uri.searchParams.set("code", code);
    if (state) uri.searchParams.set("state", state);
    res.redirect(uri.toString());
});

// /token -> support authorization_code & refresh_token
app.post("/token", async (req: Request<{}, TokenResponse, TokenRequest>, res: Response<TokenResponse | { error: string; error_description?: string }>) => {
    req.useCase = "token";
    const { grant_type } = req.body;
    
    if (grant_type === "authorization_code") {
        const { code, client_id, redirect_uri, code_verifier } = req.body;
        if (!code || !code_verifier) {
            return res.status(400).json({ error: "invalid_request" });
        }

        const auth = await AuthCodeModel.findOne({ code });
        if (!auth) {
            return res.status(400).json({ error: "invalid_grant" });
        }
        if (auth.expires_at < new Date()) {
            await AuthCodeModel.deleteOne({ code });
            return res.status(400).json({ error: "expired_code" });
        }
        if (auth.client_id !== client_id) {
            return res.status(400).json({ error: "client_mismatch" });
        }
        if (auth.redirect_uri !== redirect_uri) {
            return res.status(400).json({ error: "redirect_mismatch" });
        }
        if (auth.used) {
            return res.status(400).json({ error: "code_already_used" });
        }

        // PKCE verify
        const hash = crypto.createHash("sha256").update(code_verifier).digest();
        const chal = toBase64Url(hash);
        if (chal !== auth.code_challenge) {
            return res.status(400).json({
                error: "invalid_grant",
                error_description: "PKCE mismatch"
            });
        }

        const user = await UserModel.findById(auth.user_id);
        if (!user) {
            return res.status(400).json({ error: "user_not_found" });
        }

        // Create access_token (RS256)
        const { accessToken, refreshToken } = await issueTokens(user, client_id!);
        const idToken = await issueIdToken(user, client_id!);

        await AuthCodeModel.updateOne({ code }, { used: true });
        return res.json({
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: idToken,
            token_type: "Bearer",
            expires_in: 3600,
        });
    }

    // === REFRESH TOKEN FLOW ===
    if (grant_type === "refresh_token") {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: "invalid_request" });
        }
        
        const tokenDoc = await RefreshTokenModel.findOne({ token: refresh_token });
        if (!tokenDoc || tokenDoc.expires_at < new Date()) {
            return res.status(400).json({ error: "invalid_refresh_token" });
        }

        const user = await UserModel.findById(tokenDoc.user_id);
        if (!user) {
            return res.status(400).json({ error: "user_not_found" });
        }
        
        const { accessToken, refreshToken: refreshTokenValue } = await issueTokens(user, tokenDoc.client_id);
        const idToken = await issueIdToken(user, tokenDoc.client_id);

        // Optionally revoke old refresh token
        await RefreshTokenModel.deleteOne({ token: refresh_token });

        return res.json({
            access_token: accessToken,
            refresh_token: refreshTokenValue,
            id_token: idToken,
            token_type: "Bearer",
            expires_in: 3600,
        });
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
});

const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

async function verifyAccessToken(token: string, expectedAud: string) {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: expectedAud });
    return payload;
}

app.get("/userinfo", async (req: Request, res: Response): Promise<Response | void> => {
    req.useCase = "userinfo";
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "missing_token" });
        }
        
        const token = auth.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "missing_token" });
        }
        
        const payload = await verifyAccessToken(token, "spa-client");
        const user = await UserModel.findOne({ username: payload.sub });
        if (!user) {
            return res.status(404).json({ error: "user_not_found" });
        }
        
        res.json({ sub: user._id, name: user.name, email: user.email });
    } catch (err: any) {
        res.status(401).json({ error: "invalid_token", message: err.message });
    }
});

// /revoke
app.post("/revoke", async (req: Request, res: Response) => {
    req.useCase = "revoke";
    const { token } = req.body;
    const deleted = await RefreshTokenModel.deleteOne({ token });
    res.json({ revoked: deleted.deletedCount > 0 });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Auth Server running http://localhost:${PORT}`));