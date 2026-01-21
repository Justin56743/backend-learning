# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

**Note:** If you get an error about `zod` or `bcryptjs`, you may need to install them:
```bash
npm install zod bcryptjs @types/bcryptjs @types/pg
```

## Step 2: Set Up PostgreSQL Database

1. Make sure PostgreSQL is installed and running
2. Create a database:
```sql
CREATE DATABASE contestdb;
```

3. Update `.env` file with your database credentials:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/contestdb
JWT_SECRET=your-secret-key-here
PORT=3000
```

## Step 3: Initialize Database Schema

Run the database initialization script:
```bash
npm run init-db
```

This will create all the necessary tables in your database.

## Step 4: Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Step 5: Test the API

The server should be running on `http://localhost:3000`

Test the signup endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "contestee"
  }'
```

## API Endpoints Summary

### Authentication (No JWT required)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Contests (JWT required)
- `GET /api/contests` - List all contests
- `GET /api/contests/:id` - Get contest details
- `POST /api/contests` - Create contest (creator only)
- `POST /api/contests/:id/mcq` - Add MCQ question (creator only)
- `POST /api/contests/:id/dsa` - Add DSA problem (creator only)

### Problems (JWT required)
- `POST /api/problems/:id/test-cases` - Add test case (creator only)

### Submissions (JWT required, contestee only, during contest time)
- `POST /api/contests/:contestId/mcq/submit` - Submit MCQ answer
- `POST /api/contests/:contestId/dsa/submit` - Submit DSA solution
- `GET /api/contests/:contestId/submissions` - Get user's submissions

## Important Notes

1. **All endpoints except signup/login require JWT authentication**
2. **Include JWT in header:** `Authorization: Bearer <token>`
3. **Creators cannot submit to their own contests**
4. **Submissions only allowed during contest time window**
5. **Hidden test cases are never exposed to contestees**

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env` is correct
- Ensure database exists

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using the port

### Module Not Found Errors
- Run `npm install` again
- Check all dependencies are installed
