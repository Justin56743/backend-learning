import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// Validation schemas using Zod
const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['creator', 'contestee']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/signup
 * Register a new user
 */
export const signup = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { name, email, password, role = 'contestee' } = validationResult.data;

    // Check if email already exists
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return sendError(res, 'EMAIL_ALREADY_EXISTS', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0];

    // Return success response with strict format
    return sendSuccess(res, user, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
export const login = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'INVALID_REQUEST', 400);
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return sendError(res, 'INVALID_CREDENTIALS', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return sendError(res, 'INVALID_CREDENTIALS', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        userRole: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Return success response with strict format (only token per docs)
    return sendSuccess(res, {
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'INTERNAL_ERROR', 500);
  }
};
