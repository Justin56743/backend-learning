import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { pool } from '../config/database';
import { sendError } from '../utils/response';

/**
 * Middleware to prevent creators from submitting to their own contests
 * Works with both contestId (from params) and problemId (gets contest from problem)
 */
export const preventCreatorSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  let contestId: number | null = null;

  // Try to get contestId from params (for MCQ submissions)
  if (req.params.contestId) {
    const contestIdRaw = Array.isArray(req.params.contestId)
      ? req.params.contestId[0]
      : req.params.contestId;
    contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }
  }
  // If contestId was set by checkContestTime middleware (for DSA submissions)
  else if ((req as any).contestId) {
    contestId = (req as any).contestId;
  }
  // If problemId is present, get contest_id from problem
  else if (req.params.problemId) {
    const problemIdRaw = Array.isArray(req.params.problemId)
      ? req.params.problemId[0]
      : req.params.problemId;
    const problemId = parseInt(String(problemIdRaw), 10);
    if (Number.isNaN(problemId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    try {
      const problemResult = await pool.query(
        'SELECT contest_id FROM dsa_problems WHERE id = $1',
        [problemId]
      );
      if (problemResult.rows.length === 0) {
        return sendError(res, 'PROBLEM_NOT_FOUND', 404);
      }
      contestId = problemResult.rows[0].contest_id;
    } catch (error) {
      console.error('Error getting problem:', error);
      return sendError(res, 'INTERNAL_ERROR', 500);
    }
  } else {
    return sendError(res, 'INVALID_REQUEST', 400);
  }

  if (!userId || !contestId) {
    return sendError(res, 'INVALID_REQUEST', 400);
  }

  try {
    const result = await pool.query('SELECT creator_id FROM contests WHERE id = $1', [contestId]);

    if (result.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }

    if (result.rows[0].creator_id === userId) {
      return sendError(res, 'FORBIDDEN', 403);
    }

    next();
  } catch (error) {
    console.error('Error checking creator:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};
