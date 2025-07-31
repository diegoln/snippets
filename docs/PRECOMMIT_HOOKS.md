# Enhanced Pre-commit Hooks

This document describes the enhanced pre-commit hooks that prevent issues like the `assessmentDirections` → `checkInFocusAreas` property consistency problem.

## Overview

Our pre-commit hooks now include advanced consistency checking that would have caught the career check-in rebranding issues before they reached production:

1. **Property Consistency Check** - Ensures deprecated properties aren't used
2. **API Contract Validation** - Verifies frontend-backend contract compliance  
3. **Template Variable Validation** - Checks Handlebars templates use valid properties
4. **Standard TypeScript & Linting** - Existing syntax validation

## What Gets Checked

### 1. Property Consistency (`check-property-consistency.js`)

**Purpose**: Prevents usage of deprecated property names across the codebase.

**What it catches**:
- ❌ `assessmentDirections` used instead of `checkInFocusAreas`
- ❌ Mixed usage of old and new property names in same file
- ❌ Form field IDs that don't match their data properties
- ⚠️  Cross-file inconsistencies between frontend and API

**Example output**:
```
❌ Property Consistency Issues Found:

  components/CareerCheckIn.tsx (frontend)
    └─ Found deprecated property "assessmentDirections" - should use "checkInFocusAreas"

  app/api/assessments/route.ts (api)  
    └─ Found deprecated property "assessmentDirections" - should use "checkInFocusAreas"
```

### 2. API Contract Validation (`validate-api-contracts.js`)

**Purpose**: Ensures frontend API calls match backend expectations.

**What it catches**:
- ❌ Missing required fields in API requests
- ❌ Using deprecated fields that API no longer accepts
- ⚠️  Unknown fields not defined in API contract
- ⚠️  Form fields that don't map to API endpoints

**Example output**:
```
❌ API contract validation failed

📄 components/CareerCheckIn.tsx
  ❌ Using deprecated field "assessmentDirections" - this field is no longer accepted by the API
     └─ in POST /api/assessments
  ❌ Missing required field "cycleName" in API call  
     └─ in POST /api/assessments
```

### 3. Template Variable Validation (`check-template-variables.js`)

**Purpose**: Ensures Handlebars templates only reference properties that exist.

**What it catches**:
- ❌ Template variables that reference deprecated properties
- ⚠️  Unknown template variables not in context objects
- ⚠️  Nested property references that may not exist

**Example output**:
```
❌ Template validation errors:

  📄 lib/prompts/career-check-in.md
     └─ Template uses deprecated variable "assessmentDirections" - this property no longer exists in the context
```

## Configuration

### Property Mappings (`.consistency-config.json`)

Define deprecated → new property mappings:

```json
{
  "propertyMappings": {
    "assessmentDirections": "checkInFocusAreas",
    "performanceAssessment": "careerCheckIn", 
    "assessmentId": "checkInId"
  }
}
```

### API Contracts

Define expected request/response schemas:

```json
{
  "apiContracts": {
    "/api/assessments": {
      "POST": {
        "body": {
          "required": ["cycleName", "startDate", "endDate"],
          "optional": ["checkInFocusAreas"],
          "deprecated": ["assessmentDirections"]
        }
      }
    }
  }
}
```

## Running Checks Manually

```bash
# Run individual checks
npm run check:consistency     # Property consistency
npm run check:contracts      # API contracts  
npm run check:templates      # Template variables

# Run all consistency checks
npm run check:all

# Run with detailed output
DEBUG=1 npm run check:consistency
```

## Integration with Git Workflow

### Pre-commit Hook Flow

1. **TypeScript Compilation** - Syntax validation
2. **ESLint** - Code quality rules
3. **Property Consistency** - Cross-file property validation
4. **API Contract Validation** - Frontend-backend consistency
5. **Template Validation** - Template variable checking
6. **Basic Tests** - Functional validation

### Bypassing Checks (Emergency Only)

```bash
# Skip all pre-commit hooks (not recommended)
git commit --no-verify -m "emergency fix"

# Skip only consistency checks
SKIP_CONSISTENCY=1 git commit -m "bypass consistency checks"
```

## How This Prevents Issues

### The `assessmentDirections` Problem

Our original issue occurred because:

1. ✅ We updated the TypeScript types (`CheckInContext`)
2. ❌ We missed updating the form label `htmlFor` attribute  
3. ❌ We missed updating API request destructuring
4. ❌ We missed updating template variables
5. ❌ We missed updating test expectations

### How Enhanced Hooks Would Have Caught It

With the new hooks, this would have been caught at commit time:

```bash
git commit -m "rename assessmentDirections to checkInFocusAreas"

🔗 Checking property consistency...
❌ Property consistency check failed:
  - CareerCheckIn.tsx: Found deprecated property "assessmentDirections"
  - route.ts: Found deprecated property "assessmentDirections" 
  - career-check-in.md: Template uses deprecated variable "assessmentDirections"

❌ Pre-commit check failed. Fix issues above or use --no-verify to skip.
```

## Best Practices

### For Property Renames

1. **Update configuration first**:
   ```json
   "propertyMappings": {
     "oldName": "newName"
   }
   ```

2. **Use IDE-wide search & replace** instead of manual file updates

3. **Commit in phases**:
   - Phase 1: Add new properties alongside old (backward compatibility)
   - Phase 2: Update all consumers to use new properties
   - Phase 3: Remove old properties and add to deprecated list

### For API Changes

1. **Update API contracts first** in `.consistency-config.json`
2. **Version your APIs** when making breaking changes
3. **Test contract compliance** before merging

### For Template Changes

1. **Update context types first** in TypeScript
2. **Verify template variables exist** in context objects
3. **Test template rendering** with real data

## Troubleshooting

### Common Issues

**"Property consistency check failed"**
- Update all references to deprecated properties
- Check form field IDs match their data properties
- Verify API endpoints use correct property names

**"API contract validation failed"**  
- Ensure all required fields are included in API calls
- Remove deprecated fields from request bodies
- Update API contract definitions if needed

**"Template validation failed"**
- Update template variables to match context objects
- Remove references to deprecated properties
- Check nested property paths are valid

### Debugging

```bash
# Get detailed output
DEBUG=1 npm run check:consistency

# Check specific files
node scripts/check-property-consistency.js --files="components/CareerCheckIn.tsx"

# Validate specific templates
node scripts/check-template-variables.js --templates="lib/prompts/career-check-in.md"
```

## Future Enhancements

1. **Auto-fix mode** - Automatically update deprecated properties
2. **Custom validation rules** - Project-specific consistency checks  
3. **Integration with CI/CD** - Run checks in GitHub Actions
4. **Slack notifications** - Alert team when consistency issues are found
5. **Metrics dashboard** - Track consistency over time

This enhanced pre-commit system ensures that property renames, API changes, and template updates stay consistent across the entire codebase, preventing the type of issues we encountered with the career check-in rebranding.