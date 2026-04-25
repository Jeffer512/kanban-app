import { Router } from "express";
import { deleteColumn, updateColumn } from "../controllers/columnController.ts";
import { authenticateToken } from "../middleware/auth.ts";
import { createTask } from "../controllers/taskController.ts";

const columnRouter = Router();

columnRouter.use(authenticateToken);

columnRouter.patch('/:id', updateColumn);
columnRouter.delete('/:id', deleteColumn);
columnRouter.post('/:boardId/tasks', createTask);

export default columnRouter;