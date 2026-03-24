-- Learnix Database Schema
-- Run: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS learnix;
USE learnix;

CREATE TABLE IF NOT EXISTS dept (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO dept (dept_name) VALUES
('Computer Science'),
('Data Science'),
('Information Technology'),
('Electronics'),
('Mechanical');

CREATE TABLE IF NOT EXISTS auth_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_no VARCHAR(15) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    dept_id INT,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id)
);

CREATE TABLE IF NOT EXISTS teacher (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_no VARCHAR(15) NOT NULL,
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    dept_id INT NULL,
    teacher_id INT NULL,
    video_path VARCHAR(255) NULL,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id),
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
);

INSERT IGNORE INTO courses (course_name, credits, video_path) VALUES
('Web Development', 3, '/pages/webdev-video.html'),
('Python Programming', 3, '/pages/python-video.html'),
('Data Science', 4, '/pages/ds-video.html'),
('UI / UX Design', 3, '/pages/uiux-video.html');

CREATE TABLE IF NOT EXISTS enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    grade VARCHAR(2),
    enrollment_date DATE,
    auth_user_id INT,
    course_id INT,
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE TABLE IF NOT EXISTS enrollment_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    student_email VARCHAR(150) NOT NULL,
    student_phone VARCHAR(15) NOT NULL,
    department VARCHAR(100),
    course_id INT NOT NULL,
    request_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE TABLE IF NOT EXISTS student_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    auth_user_id INT NOT NULL,
    course_id INT NOT NULL,
    attendance_pct DECIMAL(5,2) NULL,
    marks_obtained INT NULL,
    marks_total INT NULL,
    focus_area VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);
