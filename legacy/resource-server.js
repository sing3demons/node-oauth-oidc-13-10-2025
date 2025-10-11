import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logMiddleware, traceIdMiddleware } from "./logMiddleware.js";
import fs from "fs";
try {
    const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || pkg.name || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || pkg.version || "unknown";
} catch (e) {
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || "unknown";
}

const MONGO = process.env.MONGO ?? "mongodb://localhost:27017/oauthdemo";
await mongoose.connect(MONGO);
console.log("Connected to Mongo:", MONGO);

const User = mongoose.model("User", new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  username: String,
  name: String,
  email: String
}));

const app = express();
app.use(express.json());
app.use(traceIdMiddleware)
app.use(logMiddleware)
// allow requests from the client (dev)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// JWKS URL of your auth server
const JWKS_URL = "http://localhost:4000/.well-known/jwks.json";
const JWKS = createRemoteJWKSet(new URL(JWKS_URL)); // jose helper: fetch+cache JWKS

// verify function: checks signature, issuer, audience, expiry; also checks scope if given
async function verifyAccessToken(token, expectedAud, requiredScope) {
  if (!token) throw new Error("missing_token");

  // jwtVerify throws on invalid signature/claims (exp/nbf/iss/aud)
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "http://localhost:4000", // change if your issuer differs
    audience: expectedAud,
  });

  // check scope if requested
  if (requiredScope) {
    const scopes = (payload.scope || "").split(" ").filter(Boolean);
    if (!scopes.includes(requiredScope)) {
      const e = new Error("insufficient_scope");
      e.code = "insufficient_scope";
      throw e;
    }
  }

  return payload;
}

// Protected endpoint: GET /api/profile
// - expects Bearer <access_token>
// - validates aud == "spa-client" and scope includes "profile"
app.get("/api/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing_authorization" });
    }
    const token = auth.split(" ")[1];

    // verify signature + claims
    const payload = await verifyAccessToken(token, "spa-client", "profile");

    // payload.sub should be user id (string). Try to find user in DB
    const userId = payload.sub;
    let user = null;
    try {
      user = await User.findById(userId).lean();
    } catch (err) {
      // if sub is not an ObjectId, you may still have string id mapping — try fallback
      // (no-op here; keep user null)
    }

    // respond with limited profile (do not leak sensitive fields)
    return res.json({
      sub: payload.sub,
      aud: payload.aud,
      scope: payload.scope,
      user: user ? { name: user.name, email: user.email } : null
    });
  } catch (err) {
    // map insufficient_scope to 403, other verification errors -> 401
    if (err.code === "insufficient_scope") {
      return res.status(403).json({ error: "insufficient_scope" });
    }
    console.error("verify error:", err.message);
    return res.status(401).json({ error: "invalid_token", message: err.message });
  }
});

// optional health check
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => console.log(`Resource Server running on http://localhost:${PORT}`));