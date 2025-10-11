import { Router } from "express";
import { TokenController } from "../controllers/token.controller.js";

const router = Router();
const tokenController = new TokenController();

// Token endpoints
router.post("/token", tokenController.token);
router.post("/revoke", tokenController.revoke);

export { router as tokenRoutes };