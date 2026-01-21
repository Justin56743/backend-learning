import { Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { transformKeys } from '../utils/transform';

// Validation schemas - using camelCase for request body per docs
const createContestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const addMCQSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctOptionIndex: z.number().int().min(0),
  points: z.number().int().positive().optional(),
});

const addDSASchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).optional(),
  points: z.number().int().positive().optional(),
  timeLimit: z.number().int().positive().optional(),
  memoryLimit: z.number().int().positive().optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().optional(),
      })
    )
    .optional(),
});

const addTestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().optional(),
});

/**
 * POST /api/contests
 * Create a new contest (creator only)
 */
export const createContest = async (req: AuthRequest, res: Response) => {
  try {
    const validationResult = createContestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { title, description, startTime, endTime } = validationResult.data;
    const creatorId = req.userId!;

    // Validate time range
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);
    if (endTimeDate <= startTimeDate) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const result = await pool.query(
      'INSERT INTO contests (title, description, creator_id, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, description, creator_id, start_time, end_time',
      [title, description || null, creatorId, startTime, endTime]
    );

    const contest = result.rows[0];
    return sendSuccess(
      res,
      {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        creatorId: contest.creator_id,
        startTime: contest.start_time,
        endTime: contest.end_time,
      },
      201
    );
  } catch (error) {
    console.error('Create contest error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * GET /api/contests
 * Get all contests
 */
export const getAllContests = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, creator_id, start_time, end_time, created_at FROM contests ORDER BY created_at DESC'
    );

    const contests = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      creatorId: row.creator_id,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
    }));

    return sendSuccess(res, contests);
  } catch (error) {
    console.error('Get contests error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * GET /api/contests/:contestId
 * Get contest details with questions
 */
export const getContestById = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    // Get contest
    const contestResult = await pool.query('SELECT * FROM contests WHERE id = $1', [contestId]);
    if (contestResult.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }

    const contest = contestResult.rows[0];

    // Get MCQ questions (exclude correctOptionIndex for contestees)
    const mcqResult = await pool.query(
      'SELECT id, contest_id, question_text, options, points FROM mcq_questions WHERE contest_id = $1',
      [contestId]
    );

    const mcqs = mcqResult.rows.map((row) => ({
      id: row.id,
      questionText: row.question_text,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      points: row.points,
    }));

    // Get DSA problems
    const dsaResult = await pool.query(
      'SELECT id, contest_id, title, description, tags, points, time_limit, memory_limit FROM dsa_problems WHERE contest_id = $1',
      [contestId]
    );

    const dsaProblems = dsaResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      points: row.points,
      timeLimit: row.time_limit,
      memoryLimit: row.memory_limit,
    }));

    return sendSuccess(res, {
      id: contest.id,
      title: contest.title,
      description: contest.description,
      startTime: contest.start_time,
      endTime: contest.end_time,
      creatorId: contest.creator_id,
      mcqs,
      dsaProblems,
    });
  } catch (error) {
    console.error('Get contest error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * POST /api/contests/:contestId/mcq
 * Add MCQ question to contest (creator only)
 */
export const addMCQQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }
    const validationResult = addMCQSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { questionText, options, correctOptionIndex, points = 1 } = validationResult.data;

    // Verify contest exists and user is creator
    const contestResult = await pool.query('SELECT creator_id FROM contests WHERE id = $1', [
      contestId,
    ]);
    if (contestResult.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }
    if (contestResult.rows[0].creator_id !== req.userId) {
      return sendError(res, 'FORBIDDEN', 403);
    }

    // Validate correctOptionIndex
    if (correctOptionIndex >= options.length) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const result = await pool.query(
      'INSERT INTO mcq_questions (contest_id, question_text, options, correct_option_index, points) VALUES ($1, $2, $3, $4, $5) RETURNING id, contest_id',
      [contestId, questionText, JSON.stringify(options), correctOptionIndex, points]
    );

    return sendSuccess(
      res,
      {
        id: result.rows[0].id,
        contestId: result.rows[0].contest_id,
      },
      201
    );
  } catch (error) {
    console.error('Add MCQ error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * POST /api/contests/:contestId/dsa
 * Add DSA problem to contest (creator only)
 * NOTE: testCases are provided in the request body per docs
 */
export const addDSAProblem = async (req: AuthRequest, res: Response) => {
  try {
    const contestIdRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const contestId = parseInt(String(contestIdRaw), 10);
    if (Number.isNaN(contestId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }
    const validationResult = addDSASchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const {
      title,
      description,
      tags = [],
      points = 100,
      timeLimit = 2000,
      memoryLimit = 256,
      testCases = [],
    } = validationResult.data;

    // Verify contest exists and user is creator
    const contestResult = await pool.query('SELECT creator_id FROM contests WHERE id = $1', [
      contestId,
    ]);
    if (contestResult.rows.length === 0) {
      return sendError(res, 'CONTEST_NOT_FOUND', 404);
    }
    if (contestResult.rows[0].creator_id !== req.userId) {
      return sendError(res, 'FORBIDDEN', 403);
    }

    // Insert DSA problem
    const problemResult = await pool.query(
      'INSERT INTO dsa_problems (contest_id, title, description, tags, points, time_limit, memory_limit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, contest_id',
      [contestId, title, description, JSON.stringify(tags), points, timeLimit, memoryLimit]
    );

    const problemId = problemResult.rows[0].id;

    // Insert test cases if provided
    if (testCases.length > 0) {
      for (const testCase of testCases) {
        await pool.query(
          'INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES ($1, $2, $3, $4)',
          [problemId, testCase.input, testCase.expectedOutput, testCase.isHidden || false]
        );
      }
    }

    return sendSuccess(
      res,
      {
        id: problemId,
        contestId: contestId,
      },
      201
    );
  } catch (error) {
    console.error('Add DSA error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * POST /api/problems/:id/test-cases
 * Add test case to DSA problem (creator only)
 */
export const addTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const problemIdRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const problemId = parseInt(String(problemIdRaw), 10);
    if (Number.isNaN(problemId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }
    const validationResult = addTestCaseSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { input, expectedOutput, isHidden = false } = validationResult.data;

    // Verify problem exists and user is creator of the contest
    const problemResult = await pool.query(
      'SELECT contest_id FROM dsa_problems WHERE id = $1',
      [problemId]
    );
    if (problemResult.rows.length === 0) {
      return sendError(res, 'PROBLEM_NOT_FOUND', 404);
    }

    const contestResult = await pool.query('SELECT creator_id FROM contests WHERE id = $1', [
      problemResult.rows[0].contest_id,
    ]);
    if (contestResult.rows[0].creator_id !== req.userId) {
      return sendError(res, 'FORBIDDEN', 403);
    }

    const result = await pool.query(
      'INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES ($1, $2, $3, $4) RETURNING *',
      [problemId, input, expectedOutput, isHidden]
    );

    return sendSuccess(res, transformKeys(result.rows[0]), 201);
  } catch (error) {
    console.error('Add test case error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * GET /api/problems/:problemId
 * Get DSA problem details with visible test cases only
 */
export const getProblemById = async (req: AuthRequest, res: Response) => {
  try {
    const problemIdRaw = Array.isArray(req.params.problemId)
      ? req.params.problemId[0]
      : req.params.problemId;
    const problemId = parseInt(String(problemIdRaw), 10);
    if (Number.isNaN(problemId)) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    // Get problem
    const problemResult = await pool.query('SELECT * FROM dsa_problems WHERE id = $1', [
      problemId,
    ]);
    if (problemResult.rows.length === 0) {
      return sendError(res, 'PROBLEM_NOT_FOUND', 404);
    }

    const problem = problemResult.rows[0];

    // Get only visible (non-hidden) test cases
    const testCasesResult = await pool.query(
      'SELECT input, expected_output FROM test_cases WHERE problem_id = $1 AND is_hidden = false',
      [problemId]
    );

    const visibleTestCases = testCasesResult.rows.map((row) => ({
      input: row.input,
      expectedOutput: row.expected_output,
    }));

    return sendSuccess(res, {
      id: problem.id,
      contestId: problem.contest_id,
      title: problem.title,
      description: problem.description,
      tags: typeof problem.tags === 'string' ? JSON.parse(problem.tags) : problem.tags || [],
      points: problem.points,
      timeLimit: problem.time_limit,
      memoryLimit: problem.memory_limit,
      visibleTestCases,
    });
  } catch (error) {
    console.error('Get problem error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};
