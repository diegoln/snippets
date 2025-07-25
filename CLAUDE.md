# Claude Code Project Documentation

## Design System Reference

This project follows a comprehensive design system that maintains visual consistency and professional aesthetics throughout the application. All new components and modifications should adhere to these established patterns.

### Color Palette

The design system uses semantic color naming with CSS custom properties:

- **Primary Colors**: `text-primary-600`, `bg-primary-100`, `border-primary-600`
- **Secondary Colors**: `text-secondary`, `bg-surface`
- **Accent Colors**: `text-accent-500`, `bg-accent-500/10`, `border-accent-500`
- **Neutral Colors**: `bg-neutral-100`, `border-neutral-600/30`, `text-neutral-900`

### Component Classes

#### Buttons
- **Primary**: `btn-primary px-4 py-2 rounded-pill`
- **Accent**: `btn-accent px-8 py-4 rounded-pill`
- **With Shadow**: Add `shadow-elevation-1 hover:shadow-lg`

#### Cards
- **Standard**: `card p-6` or `card p-8`
- **Background**: `bg-surface` or `bg-white`
- **Borders**: `border-neutral-600/20` for subtle separators

#### Layout
- **Container**: `container mx-auto px-4`
- **Grid**: `grid grid-cols-1 md:grid-cols-3 gap-8`
- **Spacing**: Use consistent spacing with `mb-6`, `mt-8`, `space-y-4`

#### Typography
- **Headings**: `text-heading-2 text-primary` for section headers
- **Body**: `text-secondary leading-relaxed` for descriptions
- **Emphasis**: `font-semibold text-primary-600` for important text

#### Interactive Elements
- **Transitions**: `transition-advance` for smooth animations
- **Hover States**: Consistent hover effects with color and shadow changes
- **Focus States**: `focus:ring-2 focus:ring-accent-500 focus:ring-offset-2`

### Authentication Design Patterns

The authentication flow maintains design consistency:

1. **Landing Page**: Hero section with centered logo, compelling headline, and prominent CTA
2. **Auth Buttons**: Google OAuth styling with SVG icons and environment indicators
3. **Onboarding**: Step indicators, progress visualization, and guided content
4. **Loading States**: Consistent spinner components and loading messages

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