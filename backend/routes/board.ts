import { Router } from "express";
import { deleteBoard, getFullBoard, updateBoard } from "../controllers/boardController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const boardRouter = Router();

boardRouter.use(authenticateToken);

boardRouter.patch('/:id', updateBoard);
boardRouter.delete('/:id', deleteBoard);
boardRouter.get('/:id', getFullBoard);

export default boardRouter;