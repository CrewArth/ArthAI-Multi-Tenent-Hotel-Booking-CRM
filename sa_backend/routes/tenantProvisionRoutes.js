import express from 'express';
import { 
  provisionTenant, 
  listTenants, 
  toggleTenantStatus, 
  updateTenantPlan, 
  getPlatformStats, 
  getDashboardSummary,
  getTenantByTenantId,
  updateTenant
} from '../controllers/tenantProvisionController.js';
import { authenticateSa } from '../middlewares/saAuth.js';

const router = express.Router();

router.use(authenticateSa);

router.get('/dashboard-summary', getDashboardSummary);
router.post('/provision', provisionTenant);
router.get('/', listTenants);
router.get('/:tenantId', getTenantByTenantId);
router.put('/:tenantId', updateTenant);
router.patch('/:tenantId/status', toggleTenantStatus);
router.patch('/:tenantId/plan', updateTenantPlan);
router.get('/stats', getPlatformStats);

export default router;
