import { Router } from "express";
import { DiscoveryController } from "../controllers/discovery.controller.js";

const router = Router();
const discoveryController = new DiscoveryController();

// OpenID Connect Discovery
router.get("/.well-known/openid-configuration", discoveryController.getOpenIdConfiguration);
router.get("/.well-known/jwks.json", discoveryController.getJwks);

export { router as discoveryRoutes };