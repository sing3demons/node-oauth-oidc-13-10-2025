// resource-server.js
import express from "express";
import mongoose from "mongoose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logMiddleware, traceIdMiddleware } from "./logMiddleware.js";
import cors from "cors";
try {
    const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || pkg.name || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || pkg.version || "unknown";
} catch (e) {
    process.env.SERVICE_NAME = process.env.SERVICE_NAME || "unknown";
    process.env.SERVICE_VERSION = process.env.SERVICE_VERSION || "unknown";
}
n
const MONGO = process.env.MONGO ?? "mongodb://localhost:27017/oauth_demo";
await mongoose.connect(MONGO);
console.log("Resource DB:", MONGO);

const User = mongoose.model("User", new mongoose.Schema({ username: String, name: String, email: String }));

const app = express();
app.use(cors({
  origin: "http://localhost:3000", // client app ของคุณ
  credentials: true,
}));
app.use(traceIdMiddleware)
app.use(logMiddleware)
const JWKS = createRemoteJWKSet(new URL("http://localhost:4000/.well-known/jwks.json"));

async function verify(token, expectedAud, requiredScope) {
    const { payload } = await jwtVerify(token, JWKS, { issuer: "http://localhost:4000", audience: expectedAud });
    if (requiredScope) {
        const scopes = (payload.scope || "").split(" ").filter(Boolean);
        if (!scopes.includes(requiredScope)) throw new Error("insufficient_scope");
    }
    return payload;
}

app.get("/api/profile", async (req, res) => {
    req.useCase = "profile";
    try {
        const auth = req.headers.authorization;
        console.log("Authorization Header:", auth);
        if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "missing_token" });
        const token = auth.split(" ")[1];
        const payload = await verify(token, "spa-client", "profile");
        const user = await User.findById(payload.sub);
        res.json({ sub: payload.sub, aud: payload.aud, scope: payload.scope, user: user ? { name: user.name, email: user.email } : null });
    } catch (err) { res.status(401).json({ error: err.message }); }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const server = app.listen(PORT, () => console.log(`✅ Resource Server running on http://localhost:${PORT}`));

server.on("error", (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. If you have a previous instance running, stop it or set PORT to a different value.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
