import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/me", { preHandler: authenticate }, userController.getProfile);
  app.put("/users/me/profile", { preHandler: authenticate }, userController.updateProfile);
  app.get("/users/me/addresses", { preHandler: authenticate }, userController.getAddresses);
  app.post("/users/me/addresses", { preHandler: authenticate }, userController.addAddress);
  app.delete("/users/me/addresses/:id", { preHandler: authenticate }, userController.deleteAddress);
  app.put("/users/me/password", { preHandler: authenticate }, authController.changePassword);
}
