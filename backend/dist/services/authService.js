"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOAuthUser = exports.getUserById = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const env_1 = require("../config/env");
// Security constant: bcrypt salt rounds for password hashing
// Higher rounds = more secure but slower (12 is a good balance for 2024)
const BCRYPT_ROUNDS = 12;
/**
 * Register a new user account
 * @param email - User's email address
 * @param password - User's password (will be hashed)
 * @param name - User's full name
 * @returns Newly created user object
 * @throws {ApiError} 400 if user already exists
 */
const registerUser = async (email, password, name) => {
    // Check if user exists
    const existingUser = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
        throw new errorHandler_1.ApiError(400, 'User already exists');
    }
    // Hash password with secure salt rounds
    const password_hash = await bcrypt_1.default.hash(password, BCRYPT_ROUNDS);
    // Create user
    const result = await database_1.default.query(`INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at, updated_at`, [email, password_hash, name, 'fulfillment']);
    return result.rows[0];
};
exports.registerUser = registerUser;
// Dummy hash for timing attack prevention
// Pre-computed bcrypt hash to ensure consistent timing even when user doesn't exist
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7RW/tIIiTu';
/**
 * Authenticate user with email and password
 * Implements timing attack protection by always running bcrypt comparison
 * @param email - User's email address
 * @param password - User's password
 * @returns Object containing user data and JWT token
 * @throws {ApiError} 401 if credentials are invalid
 */
const loginUser = async (email, password) => {
    // Get user
    const result = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
    // Always run bcrypt to prevent timing attacks
    // If user doesn't exist, compare against dummy hash to maintain consistent timing
    const user = result.rows[0];
    const hashToCompare = user?.password_hash || DUMMY_HASH;
    const isValid = await bcrypt_1.default.compare(password, hashToCompare);
    // Check if user exists and password is valid
    if (!user || !isValid) {
        throw new errorHandler_1.ApiError(401, 'Invalid credentials');
    }
    // Generate token
    const payload = { id: user.id, email: user.email, role: user.role };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { expiresIn: env_1.env.JWT_EXPIRES_IN };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, options);
    // Remove password from response
    delete user.password_hash;
    return { user, token };
};
exports.loginUser = loginUser;
/**
 * Get user by ID
 * @param id - User's UUID
 * @returns User object or null if not found
 */
const getUserById = async (id) => {
    const result = await database_1.default.query('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getUserById = getUserById;
/**
 * Sync OAuth user from Supabase to backend database
 * Creates new user if doesn't exist, or returns existing user
 * @param email - User's email from OAuth provider
 * @param name - User's name from OAuth provider
 * @param supabaseId - Supabase user ID
 * @returns Object containing user data and JWT token
 */
const syncOAuthUser = async (email, name, supabaseId) => {
    // Check if user exists
    const existingUser = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    if (existingUser.rows.length === 0) {
        // Create new OAuth user with a hashed random password they'll never use
        const oauthPassword = await bcrypt_1.default.hash(`oauth-${supabaseId}-${Date.now()}`, BCRYPT_ROUNDS);
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`, [email, oauthPassword, name, 'fulfillment']);
        user = result.rows[0];
    }
    else {
        // User exists, just return them
        user = existingUser.rows[0];
        // Remove password from response
        delete user.password_hash;
    }
    // Generate token
    const payload = { id: user.id, email: user.email, role: user.role };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { expiresIn: env_1.env.JWT_EXPIRES_IN };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, options);
    return { user, token };
};
exports.syncOAuthUser = syncOAuthUser;
//# sourceMappingURL=authService.js.map