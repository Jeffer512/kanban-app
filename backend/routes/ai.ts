import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { generateTask } from "../controllers/aiController.ts";

const aiRouter = Router();

aiRouter.use(authenticateToken);

aiRouter.post('/generate-task', generateTask);

export default aiRouter;
