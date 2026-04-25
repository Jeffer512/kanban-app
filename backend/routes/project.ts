import { Router } from "express";
import { authenticateToken } from '../middleware/auth.ts';
import { getProjects, createProject, updateProject, deleteProject } from '../controllers/projectController.ts';
import { createBoard, getBoards } from "../controllers/boardController.ts";

const projectRouter = Router();

projectRouter.use(authenticateToken);

projectRouter.get('/', getProjects);
projectRouter.post('/', createProject);
projectRouter.patch('/:id', updateProject);
projectRouter.delete('/:id', deleteProject);
projectRouter.get('/:id/boards', getBoards);
projectRouter.post('/:id/boards', createBoard);

export default projectRouter;