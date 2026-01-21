import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { checkContestTime } from '../middleware/contestTime';
import { preventCreatorSubmission } from '../middleware/creatorCheck';
import { addTestCase, getProblemById } from '../controllers/contestController';
import { submitDSA } from '../controllers/submissionController';

const router = Router();

// Get problem details with visible test cases
router.get('/:problemId', authenticate, getProblemById);

// Add test case to DSA problem (creator only)
router.post('/:id/test-cases', authenticate, requireRole(['creator']), addTestCase);

// Submit DSA solution (contestee only, during contest time)
// Per docs: POST /api/problems/:problemId/submit
router.post(
  '/:problemId/submit',
  authenticate,
  requireRole(['contestee']),
  checkContestTime,
  preventCreatorSubmission,
  submitDSA
);

export default router;
