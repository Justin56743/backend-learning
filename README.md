# Contest Platform Backend

A backend API for a contest platform where creators can create contests with MCQ and DSA questions, and contestees can participate and submit answers.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Contest Management**: Creators can create contests with MCQ and DSA problems
- **Question Management**: Support for multiple choice questions and DSA problems with test cases
- **Submissions**: Contestees can submit answers during contest time
- **Strict API Contracts**: All APIs follow strict response formats for automated testing

## Tech Stack

- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **PostgreSQL** for database
- **JWT** for authentication
- **bcrypt** for password hashing
- **Zod** for request validation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A strong random string for JWT signing
- `PORT`: Server port (default: 3000)

### 3. Set Up Database

Make sure PostgreSQL is running, then initialize the database schema:

```bash
npm run init-db
```

This will create all necessary tables in your database.

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Contests

- `GET /api/contests` - Get all contests (requires auth)
- `GET /api/contests/:id` - Get contest details with questions (requires auth)
- `POST /api/contests` - Create a new contest (creator only)
- `POST /api/contests/:id/mcq` - Add MCQ question to contest (creator only)
- `POST /api/contests/:id/dsa` - Add DSA problem to contest (creator only)

### Problems

- `POST /api/problems/:id/test-cases` - Add test case to DSA problem (creator only)

### Submissions

- `POST /api/contests/:contestId/mcq/submit` - Submit MCQ answer (contestee only, during contest time)
- `POST /api/contests/:contestId/dsa/submit` - Submit DSA solution (contestee only, during contest time)
- `GET /api/contests/:contestId/submissions` - Get user's submissions for a contest

## Response Format

All APIs follow a strict response format:

**Success:**
```json
{
  "success": true,
  "data": {},
  "error": null
}
```

**Error:**
```json
{
  "success": false,
  "data": null,
  "error": "ERROR_CODE"
}
```

## Authentication

All endpoints except `/api/auth/signup` and `/api/auth/login` require authentication.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## User Roles

- **creator**: Can create contests, add questions/problems, add test cases
- **contestee**: Can participate in contests and submit answers

## Business Rules

1. One contest can have multiple MCQs and multiple DSA problems
2. Creators cannot submit to their own contests
3. Submissions allowed only during contest time
4. Hidden test cases are never exposed to contestees
5. JWT required for all APIs except signup/login

## Database Schema

The database includes the following tables:
- `users` - User accounts with roles
- `contests` - Contest information
- `mcq_questions` - Multiple choice questions
- `dsa_problems` - DSA problems
- `test_cases` - Test cases for DSA problems
- `mcq_submissions` - MCQ answer submissions
- `dsa_submissions` - DSA code submissions

See `src/config/schema.sql` for the complete schema.

## Error Codes

- `INVALID_REQUEST` - Invalid request body or parameters
- `EMAIL_ALREADY_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email or password
- `UNAUTHORIZED` - Missing or invalid JWT token
- `FORBIDDEN` - Insufficient permissions
- `CONTEST_NOT_FOUND` - Contest doesn't exist
- `CONTEST_NOT_STARTED` - Contest hasn't started yet
- `CONTEST_ENDED` - Contest has ended
- `CREATOR_CANNOT_SUBMIT` - Creator trying to submit to own contest
- `QUESTION_NOT_FOUND` - Question doesn't exist
- `PROBLEM_NOT_FOUND` - Problem doesn't exist
- `NO_TEST_CASES` - Problem has no test cases
- `NOT_FOUND` - Endpoint not found
- `INTERNAL_ERROR` - Server error

## Development

The project uses TypeScript for type safety. Source files are in `src/` and compiled to `dist/`.

To watch for changes during development:
```bash
npm run dev
```

## License

ISC
