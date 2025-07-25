# Claude Code Project Documentation

## Design System Reference

**🎨 For all design system information, refer to [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)**

This project follows a comprehensive design system documented in the dedicated design system file. The design system includes:
- Complete color palette and design tokens
- Typography system and spacing guidelines  
- Component patterns and interactive element styling
- Brand assets and usage guidelines
- Tailwind integration and CSS implementation
- Accessibility requirements and testing specifications

All new components and modifications must adhere to the established patterns documented in the design system file.

## Development Server (Dev Server) Definition

### What is the Dev Server?

The **dev server** refers to the local Next.js development server that runs on your machine during development. It is started using `npm run dev` and typically runs on `http://localhost:3000` (or port 3001 if 3000 is occupied).

### Key Characteristics of the Dev Server:

1. **Hot Module Replacement (HMR)**: Automatic page refresh when code changes
2. **Development Mode**: Uses development builds with helpful error messages
3. **Mock Authentication**: Uses localStorage-based mock auth instead of real OAuth
4. **Environment Variables**: Reads from `.env.local` for local configuration
5. **Fast Refresh**: React components update without losing state
6. **TypeScript Checking**: Real-time type checking and error reporting

### Dev Server Architecture:

```
npm run dev
    │
    ├─→ Next.js Development Server (port 3000)
    │   ├─→ App Router Pages
    │   ├─→ API Routes (/api/*)
    │   ├─→ Static Assets (/public/*)
    │   └─→ Dev-specific Features:
    │       ├─→ Mock Authentication (DevAuthProvider)
    │       ├─→ localStorage Sessions
    │       ├─→ SQLite Database (dev.db)
    │       └─→ Development Error Overlay
    │
    └─→ Development Tools
        ├─→ TypeScript Compiler
        ├─→ Tailwind CSS JIT
        └─→ React Fast Refresh
```

### Dev Server Requirements:

**CRITICAL**: The dev server must ALWAYS be in a working state before any changes are pushed. This means:

1. **Pre-Push Checklist**:
   - ✅ `npm run dev` starts without errors
   - ✅ Landing page loads at `http://localhost:3000`
   - ✅ Mock authentication flow works (click through mock users)
   - ✅ Main application is accessible after auth
   - ✅ No TypeScript errors in the console
   - ✅ No React hydration errors

2. **Testing Dev Server Health**:
   ```bash
   # Start the server
   npm run dev
   
   # In another terminal, verify it's running
   curl -s http://localhost:3000 | head -1
   # Should return: <!DOCTYPE html>
   ```

3. **Common Dev Server Commands**:
   - `npm run dev` - Start the development server
   - `npm run build` - Build for production (test build locally)
   - `npm run lint` - Check for linting errors
   - `npm run type-check` - Run TypeScript compiler check

### Dev Server vs Production:

| Feature | Dev Server | Production |
|---------|------------|------------|
| Port | 3000 (configurable) | Cloud Run managed |
| Database | SQLite (dev.db) | PostgreSQL |
| Auth | Mock (localStorage) | Google OAuth |
| Build | Development (unoptimized) | Production (optimized) |
| Errors | Detailed with stack traces | User-friendly messages |
| Environment | NODE_ENV=development | NODE_ENV=production |

### Maintaining Dev Server Health:

Before ANY commit or push:
1. Ensure dev server runs without errors
2. Test the complete authentication flow
3. Verify main application functionality
4. Check browser console for errors
5. Run `node run-basic-tests.js` to validate

## Component Structure

All components follow these patterns:

```typescript
/**
 * Component Description
 * 
 * Explains the component's purpose and key features
 * Lists any special behavior or environment considerations
 */

'use client' // When needed for client-side functionality

import statements...

/**
 * Interface definitions with clear documentation
 */
interface ComponentProps {
  // Well-documented properties
}

/**
 * Main component function with JSX.Element return type
 * 
 * @param props - Destructured props with types
 * @returns JSX element description
 */
export function ComponentName({ props }: ComponentProps) {
  // Implementation with thorough comments
}
```

## Environment Considerations

The application uses environment-aware patterns:

- **Development Mode**: Mock authentication, "(Dev)" labels, localStorage sessions
- **Production Mode**: Real OAuth, PostgreSQL, secure session management
- **Responsive Design**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints

## Testing Standards

All components should:
- Pass TypeScript compilation without errors
- Include proper accessibility attributes (`aria-label`, `aria-pressed`)
- Handle loading and error states appropriately
- Follow the established testing patterns in `run-basic-tests.js`

## File Organization

```
app/
├── page.tsx                 # Authentication routing
├── layout.tsx              # Root layout with providers
├── AuthenticatedApp.tsx    # Main application logic
├── onboarding/             # Onboarding flow
├── dashboard/              # Post-auth entry point
├── mock-signin/           # Development auth
└── api/auth/              # NextAuth configuration

components/
├── LandingPage.tsx        # Product showcase
├── AuthProvider.tsx       # NextAuth wrapper
├── DevAuthProvider.tsx    # Development auth
└── [existing components]  # Maintain existing structure
```

## Key Implementation Notes

1. **Authentication Flow**: Landing → Auth → Onboarding → Dashboard
2. **Session Management**: NextAuth for production, localStorage for development
3. **Design Consistency**: All new components use established color and spacing patterns
4. **Error Handling**: Comprehensive try/catch blocks with user-friendly messages
5. **Accessibility**: Proper ARIA labels, keyboard navigation, focus management

## Future Development Guidelines

When adding new features:

1. **Check Dev Server First**: Ensure it's running properly before starting work
2. **Follow Design System**: Reference DESIGN_SYSTEM.md for all styling
3. **Environment Awareness**: Handle both development and production modes
4. **TypeScript**: Maintain full type safety with proper interfaces
5. **Testing**: Update tests to cover new functionality
6. **Documentation**: Add thorough comments explaining component purpose
7. **Verify Dev Server**: Always test changes in dev server before pushing

## Git Workflow with Dev Server Verification

```bash
# Before starting work
npm run dev  # Ensure it starts cleanly

# After making changes
npm run dev  # Verify changes work
# Test authentication flow
# Check console for errors

# Before committing
node run-basic-tests.js  # Run validation tests
npm run lint  # Check for linting issues
npm run type-check  # Verify TypeScript

# Only then commit and push
git add .
git commit -m "feat: your changes"
git push
```

## Branch Management Strategy

**CRITICAL**: Always start new tasks from a new branch (never work directly on main after merging a PR)

### Post-PR Merge Workflow:

1. **After PR is merged**:
   ```bash
   git checkout main
   git pull origin main  # Sync with remote
   ```

2. **Before starting next task**:
   ```bash
   # Create new feature branch from main
   git checkout -b feat/descriptive-task-name
   
   # Verify dev server works on new branch
   npm run dev
   ```

3. **Branch naming conventions**:
   - `feat/` - New features (feat/user-settings)
   - `fix/` - Bug fixes (fix/authentication-redirect)
   - `docs/` - Documentation updates (docs/api-reference)
   - `refactor/` - Code restructuring (refactor/auth-provider)
   - `test/` - Testing improvements (test/e2e-coverage)

4. **Working on feature branch**:
   ```bash
   # Make changes, test in dev server
   npm run dev  # Always verify changes work
   
   # Commit and push to feature branch
   git add .
   git commit -m "feat: implement user settings"
   git push origin feat/user-settings
   
   # Create PR from feature branch to main
   gh pr create --title "feat: implement user settings"
   ```

5. **After PR is merged, repeat cycle**:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feat/user-settings  # Clean up old branch
   # Ready for next task - create new branch
   ```

### Why This Workflow Matters:

- **Clean history**: Each feature gets its own branch and PR
- **Safe development**: Main branch stays stable
- **Code review**: All changes go through PR process
- **Rollback capability**: Easy to revert specific features
- **Collaboration**: Multiple features can be developed in parallel

This documentation ensures the application maintains its professional, cohesive appearance while keeping the development server in a consistently working state.