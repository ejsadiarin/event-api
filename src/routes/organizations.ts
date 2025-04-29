import { Router } from 'express';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organizations';

const router = Router();

// GET /api/organizations
router.get('/', getOrganizations);

// GET /api/organizations/:id
router.get('/:id', getOrganizationById);

// POST /api/organizations
router.post('/', createOrganization);

// PUT /api/organizations/:id
router.put('/:id', updateOrganization);

// DELETE /api/organizations/:id
router.delete('/:id', deleteOrganization);

export default router;
