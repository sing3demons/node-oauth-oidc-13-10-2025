import { Router } from "express";
import { discoveryRoutes } from "./discovery.routes.js";
import { authRoutes } from "./auth.routes.js";
import { tokenRoutes } from "./token.routes.js";
import { userRoutes } from "./user.routes.js";

const router = Router();

// Mount all routes
router.use(discoveryRoutes);
router.use(authRoutes);
router.use(tokenRoutes);
router.use(userRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || "oauth-server"
  });
});

export { router as routes };