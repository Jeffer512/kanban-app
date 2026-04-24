import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { getProjects, createProject, updateProject, deleteProject } from '../controllers/projectController';

const projectRouter = express.Router();

projectRouter.use(authenticateToken);

projectRouter.get('/', getProjects);
projectRouter.post('/', createProject);
projectRouter.patch('/:id', updateProject);
projectRouter.delete('/:id', deleteProject);

export default projectRouter;