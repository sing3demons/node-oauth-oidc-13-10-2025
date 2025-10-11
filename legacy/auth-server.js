// auth-server.js
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, exportJWK, jwtVerify, importPKCS8, importSPKI, SignJWT, } from "jose";
import { logMiddleware, traceIdMiddleware } from "./logMiddleware.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
// read package.json to get service name and version set to envtings
try {
    const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || pkg.name || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || pkg.version || "unknown";
} catch (e) {
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || "unknown";
}

const MONGO = process.env.MONGO ?? "mongodb://localhost:27017/oauth_demo";
await mongoose.connect(MONGO);
console.log("Auth DB:", MONGO);

// Schemas
const User = mongoose.model("User", new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    name: String,
    email: String
}));
const Client = mongoose.model("Client", new mongoose.Schema({
    client_id: { type: String, unique: true },
    redirect_uris: [String],
    type: String
}));
const AuthCode = mongoose.model("AuthCode", new mongoose.Schema({
    code: String, client_id: String, user_id: String, redirect_uri: String, scope: String, code_challenge: String, expires_at: Date
}));
const RefreshToken = mongoose.model("RefreshToken", new mongoose.Schema({
    token: String, user_id: String, client_id: String, expires_at: Date, revoked: { type: Boolean, default: false }
}));

// ===== Keypair Setup =====
const KID = "demo-key";
const privatePem = fs.readFileSync("./keys/private.pem", "utf8");
const publicPem = fs.readFileSync("./keys/public.pem", "utf8");

const privateKey = await importPKCS8(privatePem, "RS256");
const publicKey = await importSPKI(publicPem, "RS256");


const publicJwk = await exportJWK(publicKey);
publicJwk.kid = KID;
publicJwk.use = "sig";
publicJwk.alg = "RS256";


const app = express();
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// traceId middleware
app.use(traceIdMiddleware)
app.use(logMiddleware)

const ISSUER = "http://localhost:4000";

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
const toBase64Url = buf => Buffer.from(buf).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');


// helper: issue access_token + refresh_token
async function issueTokens(user, client_id, scope = "openid profile") {
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

    await RefreshToken.create({
        userId: user._id,
        clientId: client_id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    return { accessToken, refreshToken };
}

// issue id_token

 async function issueIdToken(user, client_id) {
  const now = Math.floor(Date.now() / 1000);

  // ✅ แปลง PEM string → CryptoKey
  const privateKey = await importPKCS8(privatePem, "RS256");

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
    // ✅ ใช้ privateKey ที่ import แล้ว
    .sign(privateKey);
}

// Discovery & JWKS
app.get("/.well-known/openid-configuration", (req, res) => {
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
app.get("/.well-known/jwks.json", (req, res) => {
    req.useCase = "jwks";
    res.set("Cache-Control", "public, max-age=300");
    res.json({ keys: [publicJwk] });
});

// /authorize (show login form) — require PKCE
app.get("/authorize", async (req, res) => {
    req.useCase = "authorize";
    const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } = req.query;
    const client = await Client.findOne({ client_id });
    if (!client || !client.redirect_uris.includes(redirect_uri)) return res.status(400).send("invalid_client");
    if (response_type !== "code") return res.status(400).send("unsupported_response_type");
    if (!code_challenge || code_challenge_method !== "S256") return res.status(400).send("PKCE required (S256)");

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
app.post("/login", async (req, res) => {
    req.useCase = "login";
    const { username, password, client_id, redirect_uri, scope, state, code_challenge } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).send("invalid credentials");

    const code = uuidv4();
    await AuthCode.create({
        code, client_id, user_id: String(user._id), redirect_uri, scope, code_challenge, expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    const uri = new URL(redirect_uri);
    uri.searchParams.set("code", code);
    if (state) uri.searchParams.set("state", state);
    res.redirect(uri.toString());
});

// /token -> support authorization_code & refresh_token
app.post("/token", async (req, res) => {
    req.useCase = "token";
    const { grant_type } = req.body;
    if (grant_type === "authorization_code") {
        const { code, client_id, redirect_uri, code_verifier } = req.body;
        if (!code || !code_verifier) return res.status(400).json({ error: "invalid_request" });

        const auth = await AuthCode.findOne({ code });
        if (!auth) return res.status(400).json({ error: "invalid_grant" });
        if (auth.expires_at < new Date()) { await AuthCode.deleteOne({ code }); return res.status(400).json({ error: "expired_code" }); }
        if (auth.client_id !== client_id) return res.status(400).json({ error: "client_mismatch" });
        if (auth.redirect_uri !== redirect_uri) return res.status(400).json({ error: "redirect_mismatch" });

        // PKCE verify
        const hash = crypto.createHash("sha256").update(code_verifier).digest();
        const chal = toBase64Url(hash);
        if (chal !== auth.code_challenge) return res.status(400).json({ error: "invalid_grant", error_description: "PKCE mismatch" });

        const user = await User.findById(auth.user_id);

        // create access_token (RS256)
        const { accessToken, refreshToken } = await issueTokens(user, client_id);
        const idToken = await issueIdToken(user, client_id);

        await AuthCode.deleteOne({ code });
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
        const tokenDoc = await RefreshToken.findOne({ token: refresh_token });
        if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
            return res.status(400).json({ error: "invalid_refresh_token" });
        }

        const user = await User.findById(tokenDoc.userId);
        const { accessToken, refreshTokenValue } = await issueTokens(user, tokenDoc.clientId);
        const idToken = await issueIdToken(user, tokenDoc.clientId);

        // optionally revoke old refresh token
        await RefreshToken.deleteOne({ token: refresh_token });

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
async function verifyAccessToken(token, expectedAud) {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: expectedAud });
    return payload;
}
app.get("/userinfo", async (req, res) => {
    req.useCase = "userinfo";
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "missing_token" });
        const token = auth.split(" ")[1];
        const payload = await verifyAccessToken(token, "spa-client");
        const user = await User.findById(payload.sub);
        if (!user) return res.status(404).json({ error: "user_not_found" });
        res.json({ sub: user._id, name: user.name, email: user.email });
    } catch (err) { res.status(401).json({ error: "invalid_token", message: err.message }); }
});

// /revoke
app.post("/revoke", async (req, res) => {
    req.useCase = "revoke";
    const { token } = req.body;
    const deleted = await RefreshToken.deleteOne({ token });
    res.json({ revoked: deleted.deletedCount > 0 });
});

app.listen(4000, () => console.log("✅ Auth Server running http://localhost:4000"));
