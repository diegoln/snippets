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

### Component Structure

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

### Environment Considerations

The application uses environment-aware patterns:

- **Development Mode**: Mock authentication, "(Dev)" labels, localStorage sessions
- **Production Mode**: Real OAuth, PostgreSQL, secure session management
- **Responsive Design**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints

### Testing Standards

All components should:
- Pass TypeScript compilation without errors
- Include proper accessibility attributes (`aria-label`, `aria-pressed`)
- Handle loading and error states appropriately
- Follow the established testing patterns in `run-basic-tests.js`

### File Organization

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

### Key Implementation Notes

1. **Authentication Flow**: Landing → Auth → Onboarding → Dashboard
2. **Session Management**: NextAuth for production, localStorage for development
3. **Design Consistency**: All new components use established color and spacing patterns
4. **Error Handling**: Comprehensive try/catch blocks with user-friendly messages
5. **Accessibility**: Proper ARIA labels, keyboard navigation, focus management

### Future Development Guidelines

When adding new features:

1. **Check Design System**: Ensure components use existing classes and patterns
2. **Environment Awareness**: Handle both development and production modes
3. **TypeScript**: Maintain full type safety with proper interfaces
4. **Testing**: Update tests to cover new functionality
5. **Documentation**: Add thorough comments explaining component purpose and behavior

This design system ensures the application maintains its professional, cohesive appearance while providing an excellent user experience across all features and environments.