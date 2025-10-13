import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
 dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for service info
const pkgPath = join(__dirname, "../../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

export const config = {
  // Service Info
  service: {
    name: process.env.SERVICE_NAME || pkg.name || "oauth-oidc-server",
    version: process.env.SERVICE_VERSION || pkg.version || "1.0.0",
  },

  // Server Config
  server: {
    port: parseInt(process.env.PORT || "4000"),
    host: process.env.HOST || "localhost",
    issuer: process.env.ISSUER || "http://localhost:4000",
  },

  // Database Config
  database: {
    mongodb: process.env.MONGO_URL || "",
  },

  // JWT Config
  jwt: {
    kid: process.env.JWT_KID || "demo-key",
    algorithm: "RS256" as const,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    idTokenExpiry: process.env.ID_TOKEN_EXPIRY || "1h",
  },

  // Keys Config
  keys: {
    privateKeyPath: process.env.PRIVATE_KEY_PATH || "./keys/private.pem",
    publicKeyPath: process.env.PUBLIC_KEY_PATH || "./keys/public.pem",
  },

  // CORS Config
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },

  // Environment
  env: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",
} as const;

export type Config = typeof config;