import { Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const submitMCQSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

const submitDSASchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
});

/**
 * POST /api/contests/:contestId/mcq/:questionId/submit
 * Submit MCQ answer
 */
export const submitMCQ = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.contestId)
      ? req.params.contestId[0]
      : req.params.contestId;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const questionIdRaw = Array.isArray(req.params.questionId)
      ? req.params.questionId[0]
      : req.params.questionId;
    const questionId = parseInt(String(questionIdRaw), 10);
    if (Number.isNaN(questionId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const userId = req.userId!;
    const validationResult = submitMCQSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { selectedOptionIndex } = validationResult.data;

    // Verify question belongs to contest
    const questionResult = await pool.query(
      'SELECT contest_id, options, correct_option_index, points FROM mcq_questions WHERE id = $1',
      [questionId]
    );
    if (questionResult.rows.length === 0) {
      return sendError(res, 'QUESTION_NOT_FOUND', 404);
    }

    const question = questionResult.rows[0];
    if (question.contest_id !== contestId) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    // Check if already submitted - per docs, should return ALREADY_SUBMITTED error
    const existingSubmission = await pool.query(
      'SELECT * FROM mcq_submissions WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );

    if (existingSubmission.rows.length > 0) {
      return sendError(res, 'ALREADY_SUBMITTED', 400);
    }

    const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
    if (selectedOptionIndex >= options.length) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const isCorrect = selectedOptionIndex === question.correct_option_index;
    const pointsEarned = isCorrect ? question.points : 0;

    // Create new submission
    await pool.query(
      'INSERT INTO mcq_submissions (user_id, question_id, selected_option_index, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5)',
      [userId, questionId, selectedOptionIndex, isCorrect, pointsEarned]
    );

    return sendSuccess(
      res,
      {
        isCorrect,
        pointsEarned,
      },
      201
    );
  } catch (error) {
    console.error('Submit MCQ error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * POST /api/problems/:problemId/submit
 * Submit DSA solution
 */
export const submitDSA = async (req: AuthRequest, res: Response) => {
  try {
    const problemIdRaw = Array.isArray(req.params.problemId)
      ? req.params.problemId[0]
      : req.params.problemId;
    const problemId = parseInt(String(problemIdRaw), 10);
    if (Number.isNaN(problemId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const userId = req.userId!;
    const validationResult = submitDSASchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { code, language } = validationResult.data;

    // Verify problem exists and get contest_id
    const problemResult = await pool.query(
      'SELECT contest_id, points FROM dsa_problems WHERE id = $1',
      [problemId]
    );
    if (problemResult.rows.length === 0) {
      return sendError(res, 'PROBLEM_NOT_FOUND', 404);
    }

    const problem = problemResult.rows[0];
    const contestId = problem.contest_id;

    // Get all test cases (including hidden ones for evaluation)
    const testCasesResult = await pool.query(
      'SELECT id, input, expected_output, is_hidden FROM test_cases WHERE problem_id = $1',
      [problemId]
    );

    const testCases = testCasesResult.rows;
    if (testCases.length === 0) {
      return sendError(res, 'NO_TEST_CASES', 400);
    }

    // TODO: In a real implementation, you would execute the code here
    // For now, we'll simulate evaluation
    // This is a placeholder - you'd integrate with a code execution service like Judge0
    
    // Simulate code execution results
    let testCasesPassed = 0;
    let status = 'accepted';
    let executionTime = 0;

    // In real implementation, execute code against test cases
    // For now, simulate: assume all pass (you'd replace this with actual execution)
    testCasesPassed = testCases.length;
    status = 'accepted';

    // Calculate points per docs: Math.floor((testCasesPassed / totalTestCases) * problemPoints)
    const totalTestCases = testCases.length;
    const pointsEarned = Math.floor((testCasesPassed / totalTestCases) * problem.points);

    // Insert submission
    const result = await pool.query(
      'INSERT INTO dsa_submissions (user_id, problem_id, code, language, status, points_earned, test_cases_passed, total_test_cases, execution_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        userId,
        problemId,
        code,
        language,
        status,
        pointsEarned,
        testCasesPassed,
        totalTestCases,
        executionTime,
      ]
    );

    return sendSuccess(
      res,
      {
        status: result.rows[0].status,
        pointsEarned: result.rows[0].points_earned,
        testCasesPassed: result.rows[0].test_cases_passed,
        totalTestCases: result.rows[0].total_test_cases,
      },
      201
    );
  } catch (error) {
    console.error('Submit DSA error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * GET /api/contests/:contestId/submissions
 * Get user's submissions for a contest
 */
export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.contestId)
      ? req.params.contestId[0]
      : req.params.contestId;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const userId = req.userId!;

    // Get MCQ submissions
    const mcqSubmissionsResult = await pool.query(
      `SELECT ms.* FROM mcq_submissions ms
       JOIN mcq_questions mq ON ms.question_id = mq.id
       WHERE ms.user_id = $1 AND mq.contest_id = $2`,
      [userId, contestId]
    );

    // Get DSA submissions
    const dsaSubmissionsResult = await pool.query(
      `SELECT ds.* FROM dsa_submissions ds
       JOIN dsa_problems dp ON ds.problem_id = dp.id
       WHERE ds.user_id = $1 AND dp.contest_id = $2`,
      [userId, contestId]
    );

    return sendSuccess(res, {
      mcq_submissions: mcqSubmissionsResult.rows,
      dsa_submissions: dsaSubmissionsResult.rows,
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * GET /api/contests/:contestId/leaderboard
 * Get contest leaderboard with user rankings
 */
export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.contestId)
      ? req.params.contestId[0]
      : req.params.contestId;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    // Verify contest exists
    const contestResult = await pool.query('SELECT id FROM contests WHERE id = $1', [contestId]);
    if (contestResult.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }

    // Get all users who submitted to this contest
    // 1. Sum all MCQ points earned by each user
    const mcqPointsResult = await pool.query(
      `SELECT ms.user_id, COALESCE(SUM(ms.points_earned), 0) as total_mcq_points
       FROM mcq_submissions ms
       JOIN mcq_questions mq ON ms.question_id = mq.id
       WHERE mq.contest_id = $1
       GROUP BY ms.user_id`,
      [contestId]
    );

    // 2. For each DSA problem, take the maximum points earned across all submissions
    const dsaPointsResult = await pool.query(
      `SELECT ds.user_id, dp.id as problem_id, MAX(ds.points_earned) as max_points
       FROM dsa_submissions ds
       JOIN dsa_problems dp ON ds.problem_id = dp.id
       WHERE dp.contest_id = $1
       GROUP BY ds.user_id, dp.id`,
      [contestId]
    );

    // Combine results
    const userPointsMap = new Map<number, number>();

    // Add MCQ points
    for (const row of mcqPointsResult.rows) {
      userPointsMap.set(row.user_id, Number(row.total_mcq_points) || 0);
    }

    // Add DSA points (max per problem) - sum all max points for each user
    const userDSAPoints = new Map<number, number>();
    for (const row of dsaPointsResult.rows) {
      const currentPoints = userDSAPoints.get(row.user_id) || 0;
      userDSAPoints.set(row.user_id, currentPoints + (Number(row.max_points) || 0));
    }

    // Combine MCQ and DSA points
    for (const [userId, dsaPoints] of userDSAPoints.entries()) {
      const currentPoints = userPointsMap.get(userId) || 0;
      userPointsMap.set(userId, currentPoints + dsaPoints);
    }

    // Get user details and build leaderboard
    const userIds = Array.from(userPointsMap.keys());
    if (userIds.length === 0) {
      return sendSuccess(res, []);
    }

    const usersResult = await pool.query(
      `SELECT id, name FROM users WHERE id = ANY($1::int[])`,
      [userIds]
    );

    const leaderboard = usersResult.rows
      .map((user) => ({
        userId: user.id,
        name: user.name,
        totalPoints: userPointsMap.get(user.id) || 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Assign ranks (users with same points get same rank)
    let currentRank = 1;
    let previousPoints = -1;
    const rankedLeaderboard = leaderboard.map((entry, index) => {
      if (entry.totalPoints !== previousPoints) {
        currentRank = index + 1;
        previousPoints = entry.totalPoints;
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });

    return sendSuccess(res, rankedLeaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};
