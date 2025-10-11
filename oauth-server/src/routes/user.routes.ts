import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";

const router = Router();
const userController = new UserController();

// User endpoints
router.get("/userinfo", userController.userinfo);

export { router as userRoutes };