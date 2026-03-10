import express from 'express';
import { getCompanies, createCompany, deleteCompany, updateCompany, restoreCompany, getDeletedCompanies, restoreCompanyFromTrash } from '../controllers/companyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').get(protect, getCompanies).post(protect, createCompany);
router.route('/deleted').get(protect, getDeletedCompanies);
router.route('/restore-trash/:id').post(protect, restoreCompanyFromTrash);
router.route('/:id').delete(protect, deleteCompany).put(protect, updateCompany);
router.route('/restore').post(protect, restoreCompany);

export default router;
