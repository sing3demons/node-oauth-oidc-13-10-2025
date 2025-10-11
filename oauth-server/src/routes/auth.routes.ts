import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();
const authController = new AuthController();

// OAuth 2.0 Authorization Flow
router.get("/authorize", authController.authorize);
router.post("/login", authController.login);

export { router as authRoutes };