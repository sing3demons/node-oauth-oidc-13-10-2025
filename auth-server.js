// auth-server.js
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
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

// Generate RSA keypair once (demo). In prod keep privateKey in KMS/HSM.
const { publicKey, privateKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
const KID = `kid-${Date.now()}`;
publicJwk.kid = KID; publicJwk.use = "sig"; publicJwk.alg = "RS256";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// traceId middleware
app.use(traceIdMiddleware)
app.use(logMiddleware)

const ISSUER = "http://localhost:4000";

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
const toBase64Url = buf => Buffer.from(buf).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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
        const now = Math.floor(Date.now() / 1000);
        const accessPayload = { sub: String(user._id), scope: auth.scope || "", iss: ISSUER, aud: client_id, iat: now };
        const accessToken = await new SignJWT(accessPayload).setProtectedHeader({ alg: "RS256", kid: KID }).setExpirationTime("1h").sign(privateKey);

        // create id_token
        const idPayload = { iss: ISSUER, aud: client_id, sub: String(user._id), name: user.name, email: user.email, iat: now, exp: now + 3600 };
        const idToken = await new SignJWT(idPayload).setProtectedHeader({ alg: "RS256", kid: KID }).sign(privateKey);

        // refresh token (rotate-safe): store plaintext in demo (hash in prod)
        const rt = uuidv4();
        await RefreshToken.create({ token: rt, user_id: String(user._id), client_id, expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000) });

        await AuthCode.deleteOne({ code });
        return res.json({ access_token: accessToken, id_token: idToken, refresh_token: rt, token_type: "Bearer", expires_in: 3600 });
    }

    if (grant_type === "refresh_token") {
        const { refresh_token, client_id } = req.body;
        if (!refresh_token) return res.status(400).json({ error: "invalid_request" });

        const doc = await RefreshToken.findOne({ token: refresh_token });
        if (!doc || doc.revoked || doc.expires_at < new Date()) return res.status(400).json({ error: "invalid_grant" });
        if (doc.client_id !== client_id) return res.status(400).json({ error: "invalid_client" });

        // rotate refresh token (invalidate old)
        doc.revoked = true; await doc.save();
        const newRt = uuidv4();
        await RefreshToken.create({ token: newRt, user_id: doc.user_id, client_id: doc.client_id, expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000) });

        const user = await User.findById(doc.user_id);
        const now = Math.floor(Date.now() / 1000);
        const accessPayload = { sub: String(user._id), scope: "openid profile email", iss: ISSUER, aud: client_id, iat: now };
        const accessToken = await new SignJWT(accessPayload).setProtectedHeader({ alg: "RS256", kid: KID }).setExpirationTime("1h").sign(privateKey);

        return res.json({ access_token: accessToken, refresh_token: newRt, token_type: "Bearer", expires_in: 3600 });
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
});

// /userinfo
import { jwtVerify, createRemoteJWKSet } from "jose";
import { logMiddleware, traceIdMiddleware } from "./logMiddleware.js";
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
    if (!token) return res.status(400).json({ error: "invalid_request" });
    await RefreshToken.deleteOne({ token });
    return res.status(200).send();
});

app.listen(4000, () => console.log("✅ Auth Server running http://localhost:4000"));
