-- Learnix Database Schema
-- Run: mysql -u root -p < sql/schema.sql

DROP DATABASE IF EXISTS learnix;
CREATE DATABASE learnix;
USE learnix;

CREATE TABLE dept (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO dept (dept_name) VALUES
('Computer Science'),
('Data Science'),
('Information Technology'),
('Electronics'),
('Mechanical');

CREATE TABLE university (
    university_id INT AUTO_INCREMENT PRIMARY KEY,
    university_name VARCHAR(200) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    principal_name VARCHAR(200) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    dept_id INT NULL,
    university_id INT NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE teacher (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    dept_id INT NULL,
    university_id INT NOT NULL,
    subject VARCHAR(150) NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id),
    FOREIGN KEY (university_id) REFERENCES university(university_id)
);

CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    dept_id INT NULL,
    teacher_id INT NULL,
    video_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES dept(dept_id),
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
);

CREATE TABLE enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    grade VARCHAR(2) NULL,
    enrollment_date DATE NULL,
    auth_user_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE enrollment_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    student_email VARCHAR(150) NOT NULL,
    department VARCHAR(100) NULL,
    university_name VARCHAR(200) NULL,
    course_id INT NOT NULL,
    request_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE student_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    auth_user_id INT NOT NULL,
    course_id INT NOT NULL,
    attendance_pct DECIMAL(5,2) NULL,
    marks_obtained INT NULL,
    marks_total INT NULL,
    focus_area VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);
