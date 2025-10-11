// client.js
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cookieParser());

const AUTH = "http://localhost:4000";
const CLIENT_ID = "spa-client";
const REDIRECT_URI = "http://localhost:3000/callback";

// Helper: generate code_verifier and code_challenge
function generateCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}
function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function sha256base64url(str) {
  const hash = crypto.createHash("sha256").update(str).digest();
  return base64url(hash);
}

// Step A: start login -> generate verifier + challenge, store verifier in cookie, redirect to /authorize
app.get("/login", (req, res) => {
  const code_verifier = generateCodeVerifier();
  const code_challenge = sha256base64url(code_verifier);
  const state = crypto.randomBytes(8).toString("hex");

  // store verifier and state in cookie (demo). In SPA store in memory or secure storage
  res.cookie("pkce_verifier", code_verifier, { httpOnly: true });
  res.cookie("pkce_state", state, { httpOnly: true });

  const url = AUTH + "/authorize?" + querystring.stringify({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile",
    state,
    code_challenge,
    code_challenge_method: "S256"
  });
  res.redirect(url);
});

// Callback: receive authorization code, read verifier from cookie, exchange for token
app.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies.pkce_state;
    const code_verifier = req.cookies.pkce_verifier;

    if (!code) return res.status(400).send("missing code");
    if (!code_verifier) return res.status(400).send("missing code_verifier (cookie)");

    if (state !== storedState) return res.status(400).send("state mismatch");

    // exchange code for token
    const tokenResp = await axios.post(AUTH + "/token", querystring.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

    const { access_token, id_token } = tokenResp.data;

    // clear cookies (cleanup)
    res.clearCookie("pkce_verifier");
    res.clearCookie("pkce_state");

    // decode id_token for demo
    const decoded = jwt.decode(id_token);
    // store token in cookie (demo only)
    res.cookie("access_token", access_token, { httpOnly: true });

    res.send(`
      <h2>Login success</h2>
      <p>ID Token payload:</p>
      <pre>${JSON.stringify(decoded, null, 2)}</pre>
      <p><a href="/profile">Go to profile (calls resource server)</a></p>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("token exchange failed: " + (err.response?.data?.error || err.message));
  }
});

// Optional: call a resource (here we use auth server's userinfo via JWT verification for demo)
app.get("/profile", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.redirect("/login");

  // For demo we call auth server's JWKS and verify token here (could be resource server)
  try {
    // get jwks
    const jwks = (await axios.get(AUTH + "/.well-known/jwks.json")).data;
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64").toString());
    const key = jwks.keys.find(k => k.kid === header.kid);
    if (!key) throw new Error("key not found");

    // convert JWK -> PEM using node-jose dynamic import would be cleaner, but for demo we skip heavy verify:
    // We will just show token payload (not verified) - in real app you MUST verify with JWKS.
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    res.send(`<h2>Profile (decoded token payload)</h2><pre>${JSON.stringify(payload, null, 2)}</pre>`);
  } catch (err) {
    res.status(500).send("failed to get profile: " + err.message);
  }
});

app.listen(3000, () => console.log("Client app running on http://localhost:3000. Open /login to start PKCE flow."));
