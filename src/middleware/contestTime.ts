import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { pool } from '../config/database';
import { sendError } from '../utils/response';

/**
 * Middleware to check if contest is currently active
 * Only allows submissions during contest time window
 * Works with both contestId (from params) and problemId (gets contest from problem)
 */
export const checkContestTime = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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
  // If problemId is present (for DSA submissions), get contest_id from problem
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

  try {
    const result = await pool.query(
      'SELECT start_time, end_time FROM contests WHERE id = $1',
      [contestId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }

    const contest = result.rows[0];
    const now = new Date();
    const startTime = new Date(contest.start_time);
    const endTime = new Date(contest.end_time);

    if (now < startTime || now > endTime) {
      return sendError(res, 'CONTEST_NOT_ACTIVE', 400);
    }

    // Store contestId in request for preventCreatorSubmission middleware
    (req as any).contestId = contestId;

    next();
  } catch (error) {
    console.error('Error checking contest time:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};
