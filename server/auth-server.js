// auth-server.js
const express = require("express");
const bodyParser = require("body-parser");
const { JWK } = require("node-jose");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const querystring = require("querystring");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// In-memory stores (demo)
const clients = [
  { client_id: "spa-client", redirect_uris: ["http://localhost:3000/callback"], type: "public" }
];
const users = [{ id: "user1", username: "alice", password: "password" }];
const authCodes = {}; // code -> { client_id, user_id, redirect_uri, scope, code_challenge, exp }

let keystore, signingKey;
(async () => {
  keystore = JWK.createKeyStore();
  signingKey = await keystore.generate("RSA", 2048, { alg: "RS256", use: "sig", kid: "demo-key-1" });
})();

// OpenID discovery (minimal)
app.get("/.well-known/openid-configuration", (req, res) => {
  res.json({
    issuer: "http://localhost:4000",
    authorization_endpoint: "http://localhost:4000/authorize",
    token_endpoint: "http://localhost:4000/token",
    jwks_uri: "http://localhost:4000/.well-known/jwks.json"
  });
});

// JWKS (public keys)
app.get("/.well-known/jwks.json", (req, res) => {
  res.json(keystore.toJSON());
});

// Authorize endpoint (GET) — show login form if not logged-in (simple)
app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } = req.query;
  const client = clients.find(c => c.client_id === client_id);
  if (!client) return res.status(400).send("invalid_client_id");
  if (!client.redirect_uris.includes(redirect_uri)) return res.status(400).send("invalid_redirect_uri");
  if (response_type !== "code") return res.status(400).send("unsupported_response_type");
  if (!code_challenge || code_challenge_method !== "S256") return res.status(400).send("PKCE required (code_challenge + S256)");

  // Simple login form (POST /login) -- keep params in hidden fields
  res.send(`
    <h2>Auth Server - Login</h2>
    <form method="post" action="/login">
      <input name="username" placeholder="username" /><br/>
      <input name="password" placeholder="password" type="password" /><br/>
      <input type="hidden" name="client_id" value="${escapeHtml(client_id)}"/>
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirect_uri)}"/>
      <input type="hidden" name="state" value="${escapeHtml(state || "")}"/>
      <input type="hidden" name="scope" value="${escapeHtml(scope || "")}"/>
      <input type="hidden" name="code_challenge" value="${escapeHtml(code_challenge)}"/>
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(code_challenge_method)}"/>
      <button type="submit">Login</button>
    </form>
    <p>Use username: <b>alice</b> password: <b>password</b></p>
  `);
});

// Helper: escape simple
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }

// Login handler: validate user -> issue auth code -> redirect back
app.post("/login", (req, res) => {
  const { username, password, client_id, redirect_uri, state, scope, code_challenge } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).send("invalid credentials");

  // create authorization code
  const code = uuidv4();
  authCodes[code] = {
    client_id,
    user_id: user.id,
    redirect_uri,
    scope,
    code_challenge,
    expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
  };

  const uri = new URL(redirect_uri);
  uri.searchParams.set("code", code);
  if (state) uri.searchParams.set("state", state);
  return res.redirect(uri.toString());
});

// Token endpoint: exchange code + code_verifier -> tokens
app.post("/token", async (req, res) => {
  const { grant_type } = req.body;
  if (grant_type !== "authorization_code") return res.status(400).json({ error: "unsupported_grant_type" });

  const { code, redirect_uri, client_id, code_verifier } = req.body;
  if (!code || !code_verifier) return res.status(400).json({ error: "invalid_request" });

  const meta = authCodes[code];
  if (!meta) return res.status(400).json({ error: "invalid_grant" });
  if (meta.expires_at < Date.now()) { delete authCodes[code]; return res.status(400).json({ error: "expired_code" }); }
  if (meta.client_id !== client_id) return res.status(400).json({ error: "client_mismatch" });
  if (meta.redirect_uri !== redirect_uri) return res.status(400).json({ error: "redirect_uri_mismatch" });

  // verify PKCE: SHA256(code_verifier) base64url == stored code_challenge
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(code_verifier).digest();
  const base64url = toBase64Url(hash);
  if (base64url !== meta.code_challenge) return res.status(400).json({ error: "invalid_grant", error_description: "PKCE mismatch" });

  // OK -> issue tokens (JWT RS256)
  const payload = { sub: meta.user_id, scope: meta.scope, iss: "http://localhost:4000", aud: client_id };
  const privatePEM = signingKey.toPEM(true);
  const access_token = jwt.sign(payload, privatePEM, { algorithm: "RS256", expiresIn: "1h", keyid: signingKey.kid });
  const id_token = jwt.sign({ sub: meta.user_id, iss: "http://localhost:4000", aud: client_id }, privatePEM, { algorithm: "RS256", expiresIn: "1h", keyid: signingKey.kid });

  delete authCodes[code]; // auth code single-use

  res.json({ access_token, id_token, token_type: "Bearer", expires_in: 3600 });
});

app.listen(4000, () => console.log("Auth Server running on http://localhost:4000"));
  
// util base64url
function toBase64Url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
