import express from 'express';
import { createCompany, getCompanies, updateCompany, deleteCompany, getDeletedCompanies, restoreCompanyFromTrash, restoreCompany } from '../controllers/companyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
console.log("Loading Company Routes...");

// Restore from backup (Must come before generic routes if conflicting, though POST /restore is distinct from POST /)
router.post('/restore', protect, restoreCompany);

router.post('/', (req, res, next) => {
    console.log("Hit POST /api/companies");
    next();
}, protect, createCompany);
router.get('/', protect, getCompanies);
router.put('/:id', protect, updateCompany);
router.delete('/:id', protect, deleteCompany);

// Trash / Restore
router.get('/deleted', protect, getDeletedCompanies);
router.post('/restore-trash/:id', protect, restoreCompanyFromTrash);

export default router;
