// client.js
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import axios from "axios";
import querystring from "querystring";
import jwt from "jsonwebtoken";

const app = express();
app.use(cookieParser());
const AUTH = "http://localhost:4000";
const CLIENT_ID = "spa-client";
const REDIRECT = "http://localhost:3000/callback";

function base64url(buf){ return buf.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function genVerifier(){ return base64url(crypto.randomBytes(32)); }
function sha256b64url(str){ return base64url(crypto.createHash("sha256").update(str).digest()); }

app.get("/", (req,res) => {
  res.send(`<h3>SPA demo</h3>
    <a href="/login">Login</a><br/>
    <a href="/call-api">Call API (/api/profile)</a><br/>
    <a href="/refresh">Refresh token</a><br/>
    <a href="/revoke">Revoke refresh token</a><br/>`);
});

app.get("/login", (req,res) => {
  const verifier = genVerifier();
  const challenge = sha256b64url(verifier);
  const state = crypto.randomBytes(8).toString("hex");
  res.cookie("pkce_verifier", verifier, { httpOnly: true });
  res.cookie("pkce_state", state, { httpOnly: true });

  const url = AUTH + "/authorize?" + querystring.stringify({
    response_type: "code", client_id: CLIENT_ID, redirect_uri: REDIRECT, scope: "openid profile email",
    state, code_challenge: challenge, code_challenge_method: "S256"
  });
  res.redirect(url);
});

app.get("/callback", async (req,res) => {
  try {
    const { code, state } = req.query;
    const stored = req.cookies.pkce_state; const verifier = req.cookies.pkce_verifier;
    if(!code) return res.status(400).send("missing code");
    if(!verifier) return res.status(400).send("missing verifier");
    if(state !== stored) return res.status(400).send("state mismatch");

    const tokenResp = await axios.post(AUTH + "/token", querystring.stringify({
      grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" }});

    const { access_token, id_token, refresh_token } = tokenResp.data;
    res.clearCookie("pkce_verifier"); res.clearCookie("pkce_state");
    res.cookie("access_token", access_token, { httpOnly: true });
    res.cookie("refresh_token", refresh_token, { httpOnly: true });

    const decoded = id_token ? jwt.decode(id_token) : null;
// เพิ่มส่วนนี้ใน /callback หลังจาก login success แล้ว

res.send(`
  <h3>Login success</h3>
  <pre>${JSON.stringify(decoded, null, 2)}</pre>
  <button onclick="callApi()">Call protected API</button>
  <script>
    async function callApi() {
      const token = "${access_token}";
      const res = await fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    }
  </script>
`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("token exchange failed: " + (err.response?.data?.error || err.message));
  }
});

app.get("/call-api", async (req,res) => {
  try {
    const at = req.cookies.access_token; if(!at) return res.redirect("/login");
    const r = await axios.get("http://localhost:5000/api/profile", { headers: { Authorization: `Bearer ${at}` }});
    res.send(`<h3>API response</h3><pre>${JSON.stringify(r.data,null,2)}</pre><p><a href="/">Back</a></p>`);
  } catch (err) {
    res.status(500).send("API call failed: " + (err.response?.data?.error || err.message));
  }
});

app.get("/refresh", async (req,res) => {
  try {
    const rt = req.cookies.refresh_token; if(!rt) return res.send("No refresh token stored.");
    const tokenResp = await axios.post(AUTH + "/token", querystring.stringify({
      grant_type: "refresh_token", refresh_token: rt, client_id: CLIENT_ID
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" }});
    const { access_token, refresh_token } = tokenResp.data;
    res.cookie("access_token", access_token, { httpOnly: true });
    res.cookie("refresh_token", refresh_token, { httpOnly: true });
    res.send(`<p>Refreshed OK</p><p><a href="/">Back</a></p>`);
  } catch (err) { res.status(500).send("refresh failed: " + (err.response?.data?.error || err.message)); }
});

app.get("/revoke", async (req,res) => {
  try {
    const rt = req.cookies.refresh_token; if(!rt) return res.send("No refresh token");
    await axios.post(AUTH + "/revoke", { token: rt });
    res.clearCookie("access_token"); res.clearCookie("refresh_token");
    res.send(`<p>Revoked and cleared cookies</p><p><a href="/">Back</a></p>`);
  } catch (err) { res.status(500).send("revoke failed: " + (err.response?.data?.error || err.message)); }
});

app.listen(3000, () => console.log("Client running http://localhost:3000"));
