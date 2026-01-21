import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { checkContestTime } from '../middleware/contestTime';
import { preventCreatorSubmission } from '../middleware/creatorCheck';
import {
  createContest,
  getAllContests,
  getContestById,
  addMCQQuestion,
  addDSAProblem,
} from '../controllers/contestController';
import { submitMCQ, getSubmissions, getLeaderboard } from '../controllers/submissionController';

const router = Router();

// Public routes (require authentication)
router.get('/', authenticate, getAllContests);
router.get('/:id', authenticate, getContestById);

// Creator-only routes
router.post('/', authenticate, requireRole(['creator']), createContest);
router.post('/:id/mcq', authenticate, requireRole(['creator']), addMCQQuestion);
router.post('/:id/dsa', authenticate, requireRole(['creator']), addDSAProblem);

// Submission routes (contestee only, during contest time)
// Per docs: POST /api/contests/:contestId/mcq/:questionId/submit
router.post(
  '/:contestId/mcq/:questionId/submit',
  authenticate,
  requireRole(['contestee']),
  checkContestTime,
  preventCreatorSubmission,
  submitMCQ
);

// Get submissions
router.get('/:contestId/submissions', authenticate, getSubmissions);

// Leaderboard
router.get('/:contestId/leaderboard', authenticate, getLeaderboard);

export default router;
