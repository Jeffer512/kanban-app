import { Router } from "express";
import { deleteTask, updateTask } from "../controllers/taskController";
import { authenticateToken } from "../middleware/auth";

const taskRouter = Router();

taskRouter.use(authenticateToken);

taskRouter.patch('/:id', updateTask);
taskRouter.delete('/:id', deleteTask);

export default taskRouter;