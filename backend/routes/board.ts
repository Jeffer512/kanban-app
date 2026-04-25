import { Router } from "express";
import { deleteBoard, getFullBoard, updateBoard } from "../controllers/boardController.ts";
import { authenticateToken } from "../middleware/auth.ts";
import { createColumn } from "../controllers/columnController.ts";

const boardRouter = Router();

boardRouter.use(authenticateToken);

boardRouter.patch('/:id', updateBoard);
boardRouter.delete('/:id', deleteBoard);
boardRouter.get('/:id', getFullBoard);
boardRouter.post('/:boardId/columns', createColumn);

export default boardRouter;