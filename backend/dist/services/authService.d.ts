import { User } from '../models/types';
/**
 * Register a new user account
 * @param email - User's email address
 * @param password - User's password (will be hashed)
 * @param name - User's full name
 * @returns Newly created user object
 * @throws {ApiError} 400 if user already exists
 */
export declare const registerUser: (email: string, password: string, name: string) => Promise<User>;
/**
 * Authenticate user with email and password
 * Implements timing attack protection by always running bcrypt comparison
 * @param email - User's email address
 * @param password - User's password
 * @returns Object containing user data and JWT token
 * @throws {ApiError} 401 if credentials are invalid
 */
export declare const loginUser: (email: string, password: string) => Promise<{
    user: User;
    token: string;
}>;
/**
 * Get user by ID
 * @param id - User's UUID
 * @returns User object or null if not found
 */
export declare const getUserById: (id: string) => Promise<User | null>;
/**
 * Sync OAuth user from Supabase to backend database
 * Creates new user if doesn't exist, or returns existing user
 * @param email - User's email from OAuth provider
 * @param name - User's name from OAuth provider
 * @param supabaseId - Supabase user ID
 * @returns Object containing user data and JWT token
 */
export declare const syncOAuthUser: (email: string, name: string, supabaseId: string) => Promise<{
    user: User;
    token: string;
}>;
//# sourceMappingURL=authService.d.ts.map