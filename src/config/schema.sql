-- Database Schema for Contest Platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('creator', 'contestee')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contests table
CREATE TABLE IF NOT EXISTS contests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

-- MCQ Questions table
CREATE TABLE IF NOT EXISTS mcq_questions (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DSA Problems table
CREATE TABLE IF NOT EXISTS dsa_problems (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tags JSONB,
    points INTEGER DEFAULT 100,
    time_limit INTEGER DEFAULT 2000,
    memory_limit INTEGER DEFAULT 256,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL REFERENCES dsa_problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCQ Submissions table
CREATE TABLE IF NOT EXISTS mcq_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- DSA Submissions table
CREATE TABLE IF NOT EXISTS dsa_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id INTEGER NOT NULL REFERENCES dsa_problems(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    points_earned INTEGER DEFAULT 0,
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    execution_time INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contests_creator ON contests(creator_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_contest ON mcq_questions(contest_id);
CREATE INDEX IF NOT EXISTS idx_dsa_problems_contest ON dsa_problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_mcq_submissions_user ON mcq_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_submissions_question ON mcq_submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_dsa_submissions_user ON dsa_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_dsa_submissions_problem ON dsa_submissions(problem_id);
