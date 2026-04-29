import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { deleteTask, moveTask, updateTask } from "../controllers/taskController.ts";

const taskRouter = Router();

taskRouter.use(authenticateToken);

taskRouter.patch('/:id', updateTask);
taskRouter.delete('/:id', deleteTask);
taskRouter.patch('/:id/move', moveTask);

export default taskRouter;