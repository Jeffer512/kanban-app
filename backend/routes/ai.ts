import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { generateTask, generateTasks } from "../controllers/aiController.ts";
import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: "draft-8",     
  legacyHeaders: false,      
});

const aiRouter = Router();

aiRouter.use(authenticateToken);
aiRouter.use(aiLimiter);

aiRouter.post('/generate-task', generateTask);
aiRouter.post('/generate-tasks', generateTasks);

export default aiRouter;
