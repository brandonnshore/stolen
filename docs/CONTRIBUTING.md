# Contributing to StolenTee

Thank you for considering contributing to StolenTee! This document provides guidelines and best practices for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Read the documentation:**
   - [README.md](../README.md)
   - [SETUP.md](./SETUP.md)
   - [ARCHITECTURE.md](./ARCHITECTURE.md)

2. **Set up your development environment:**
   - Follow [SETUP.md](./SETUP.md) to get the project running locally
   - Verify all tests pass: `npm test`
   - Verify linting passes: `npm run lint`

3. **Familiarize yourself with the codebase:**
   - Browse the code structure
   - Read existing code to understand patterns
   - Review open issues and pull requests

---

### Finding Something to Work On

1. **Check the issue tracker:**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to let others know you're working on it

2. **Report bugs:**
   - Search existing issues first
   - If not found, create a new issue with:
     - Clear title
     - Steps to reproduce
     - Expected vs actual behavior
     - Environment details

3. **Propose features:**
   - Open a discussion issue first
   - Explain the use case and benefits
   - Wait for maintainer feedback before implementing

---

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/stolentee.git
cd stolentee

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/stolentee.git
```

---

### 2. Create a Branch

**Branch naming convention:**
```
<type>/<short-description>

Examples:
feature/add-hoodie-product
fix/cart-persistence-bug
docs/update-api-documentation
refactor/simplify-auth-service
```

**Branch types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

**Create branch:**
```bash
git checkout -b feature/add-hoodie-product
```

---

### 3. Make Changes

**Best practices:**

1. **Keep changes focused:**
   - One feature/fix per PR
   - Don't mix unrelated changes

2. **Write clean code:**
   - Follow existing code style
   - Add comments for complex logic
   - Use meaningful variable names

3. **Test your changes:**
   - Add unit tests for new features
   - Ensure existing tests still pass
   - Test manually in the browser

4. **Update documentation:**
   - Update README if needed
   - Add JSDoc comments to functions
   - Update API docs if endpoints changed

---

### 4. Commit Changes

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(products): add hoodie product support

- Add hoodie product type to database schema
- Create HoodieCanvas component for customizer
- Add hoodie-specific decoration placements
- Update pricing calculations for hoodies

Closes #42
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Scopes:**
- `products` - Product-related changes
- `orders` - Order-related changes
- `auth` - Authentication changes
- `uploads` - Upload functionality
- `payments` - Payment processing
- `customizer` - Canvas customizer
- `api` - Backend API changes
- `ui` - Frontend UI changes

**Make commits:**
```bash
git add .
git commit -m "feat(products): add hoodie product support"
```

---

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/add-hoodie-product

# Create pull request on GitHub
```

---

## Coding Standards

### TypeScript

**Use TypeScript for all code:**
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id) {
  // ...
}
```

**Avoid `any` type:**
```typescript
// ✅ Good
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ❌ Bad
function handleResponse(data: any) {
  // ...
}
```

---

### Code Style

**Use Prettier for formatting:**
```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

**ESLint rules:**
```bash
# Lint all files
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Key rules:**
- Indent: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- Max line length: 100 characters
- No trailing whitespace

---

### Naming Conventions

**Files:**
```
PascalCase for components: UserProfile.tsx
camelCase for utilities: formatDate.ts
kebab-case for routes: user-profile.ts
```

**Variables:**
```typescript
// camelCase for variables and functions
const userName = 'John';
function getUserName() {}

// PascalCase for classes and components
class UserService {}
function UserProfile() {}

// UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'http://localhost:3001';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

**Database:**
```
snake_case for tables and columns:
users, user_id, created_at
```

---

### Comments

**Add JSDoc comments to all public functions:**

```typescript
/**
 * Authenticates a user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns JWT token and user object
 * @throws {ApiError} If credentials are invalid
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Implementation
}
```

**Add inline comments for complex logic:**

```typescript
// ✅ Good
// Calculate discount based on quantity breaks
// 1-9: 0%, 10-49: 10%, 50+: 20%
const discount = calculateDiscount(quantity);

// ❌ Bad
// Calculate discount
const discount = calculateDiscount(quantity);
```

---

### Error Handling

**Use custom error classes:**

```typescript
// ✅ Good
if (!user) {
  throw new ApiError(404, 'User not found');
}

// ❌ Bad
if (!user) {
  throw new Error('User not found');
}
```

**Always handle async errors:**

```typescript
// ✅ Good
try {
  const user = await getUserById(id);
  return user;
} catch (error) {
  logger.error('Failed to get user', { id }, error as Error);
  throw new ApiError(500, 'Internal server error');
}

// ❌ Bad
const user = await getUserById(id); // Unhandled promise rejection
```

---

### React Best Practices

**Use functional components with hooks:**

```tsx
// ✅ Good
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}

// ❌ Bad (class components)
class UserProfile extends React.Component {
  // ...
}
```

**Extract complex logic into custom hooks:**

```tsx
// ✅ Good
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}

function UserProfile({ userId }: { userId: string }) {
  const { user, loading } = useUser(userId);
  // ...
}
```

**Use meaningful prop names:**

```tsx
// ✅ Good
<Button onClick={handleSubmit} disabled={isLoading}>
  Submit
</Button>

// ❌ Bad
<Button cb={handleSubmit} dis={isLoading}>
  Submit
</Button>
```

---

### Backend Best Practices

**Separate concerns:**

```typescript
// ✅ Good
// Controller: Handle request/response
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// Service: Business logic
export async function getUserById(id: string): Promise<User> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }
  return result.rows[0];
}
```

**Use parameterized queries:**

```typescript
// ✅ Good
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ Bad (SQL injection risk)
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

**Always validate input:**

```typescript
// ✅ Good
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email');
  }

  if (!password || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // ...
};
```

---

## Testing Requirements

### Test Coverage Goals

- **Backend:** Aim for >70% coverage
- **Frontend:** Aim for >60% coverage
- **Critical paths:** 100% coverage required

---

### Writing Tests

**Backend tests (Jest):**

```typescript
// backend/src/services/__tests__/authService.test.ts

import { loginUser } from '../authService';
import { ApiError } from '../../middleware/errorHandler';

describe('authService', () => {
  describe('loginUser', () => {
    it('should return token and user on valid credentials', async () => {
      const result = await loginUser('admin@stolentee.com', 'admin123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('admin@stolentee.com');
    });

    it('should throw ApiError on invalid credentials', async () => {
      await expect(
        loginUser('admin@stolentee.com', 'wrongpassword')
      ).rejects.toThrow(ApiError);
    });
  });
});
```

**Frontend tests (Vitest + Testing Library):**

```typescript
// frontend/src/components/__tests__/UserProfile.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import UserProfile from '../UserProfile';

describe('UserProfile', () => {
  it('should display user name when loaded', async () => {
    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(<UserProfile userId="123" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

---

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Pull Request Process

### Before Submitting

**Checklist:**

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Documentation updated (if needed)
- [ ] JSDoc comments added to new functions
- [ ] Manual testing completed
- [ ] No console.log statements (use logger)
- [ ] Meaningful commit messages

---

### PR Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe)

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
Add screenshots

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No breaking changes (or documented)

## Related Issues
Closes #42
```

---

### Review Process

1. **Automated checks:**
   - CI/CD pipeline runs tests
   - Linting checks
   - Build verification

2. **Code review:**
   - At least 1 maintainer approval required
   - Address feedback promptly
   - Keep discussions professional

3. **Merge:**
   - Squash commits (if multiple small commits)
   - Delete branch after merge

---

## Documentation

### When to Update Docs

Update documentation when you:

- Add a new API endpoint → Update `docs/API.md`
- Change architecture → Update `docs/ARCHITECTURE.md`
- Add a feature → Update `README.md`
- Fix a common issue → Update `docs/TROUBLESHOOTING.md`
- Change setup process → Update `docs/SETUP.md`

---

### Writing Good Documentation

**Be clear and concise:**

```markdown
✅ Good:
To start the backend server, run `npm run dev` from the `backend/` directory.

❌ Bad:
You can start the server by running the dev command.
```

**Include examples:**

```markdown
✅ Good:
```bash
# Start backend server
cd backend
npm run dev
```

Expected output:
```
Server listening on port 3001
```

❌ Bad:
Start the server.
```

**Use proper formatting:**

- Code blocks: Use triple backticks with language
- Commands: Use `bash` code blocks
- API examples: Use `json` or `typescript`
- Links: Use relative paths for internal docs

---

## Security

### Reporting Security Issues

**DO NOT** open a public issue for security vulnerabilities.

Instead:
1. Email security@stolentee.com
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

---

### Security Best Practices

**Never commit secrets:**

```bash
# ❌ Bad - secrets in code
const API_KEY = 'abc123';

# ✅ Good - use environment variables
const API_KEY = process.env.API_KEY;
```

**Use `.gitignore`:**

```
.env
.env.local
*.key
*.pem
secrets/
```

**Validate all input:**

```typescript
// ✅ Always validate and sanitize
const email = req.body.email.trim().toLowerCase();
if (!isValidEmail(email)) {
  throw new ApiError(400, 'Invalid email');
}
```

---

## Questions?

If you have questions:

1. Check existing documentation
2. Search GitHub issues
3. Ask in discussions
4. Reach out to maintainers

---

## Thank You!

Your contributions make StolenTee better for everyone. We appreciate your time and effort!

---

**Last Updated:** 2025-11-26
**Maintainer:** StolenTee Development Team
