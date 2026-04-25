import { Router } from "express";
import { deleteTask, moveTask, updateTask } from "../controllers/taskController";
import { authenticateToken } from "../middleware/auth";

const taskRouter = Router();

taskRouter.use(authenticateToken);

taskRouter.patch('/:id', updateTask);
taskRouter.delete('/:id', deleteTask);
taskRouter.patch('/:id/move', moveTask);

export default taskRouter;