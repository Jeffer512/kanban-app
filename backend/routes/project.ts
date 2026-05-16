import { Router } from "express";
import { authenticateToken } from '../middleware/auth.ts';
import { getProjects, createProject, updateProject, deleteProject, inviteUsersToProject, getInvitations, respondToInvitation } from '../controllers/projectController.ts';
import { createBoard, getBoards } from "../controllers/boardController.ts";

const projectRouter = Router();

projectRouter.use(authenticateToken);

projectRouter.get('/invitations', getInvitations);

projectRouter.get('/', getProjects);
projectRouter.post('/', createProject);

projectRouter.post('/:id/members', inviteUsersToProject);
projectRouter.patch('/:id/invitations', respondToInvitation);

projectRouter.patch('/:id', updateProject);
projectRouter.delete('/:id', deleteProject);

projectRouter.get('/:projectId/boards', getBoards);
projectRouter.post('/:projectId/boards', createBoard);

export default projectRouter;