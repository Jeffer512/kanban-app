import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { generateTask, generateTasks } from "../controllers/aiController.ts";

const aiRouter = Router();

aiRouter.use(authenticateToken);

aiRouter.post('/generate-task', generateTask);
aiRouter.post('/generate-tasks', generateTasks);

export default aiRouter;
