-- Argon2 해시(접두사 포함)는 BCrypt보다 길어 컬럼을 넓힌다.
ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255);
