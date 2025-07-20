# System Architecture

## Overview

The Weekly Snippets Reminder system is built around a central UserHub component that manages user interactions, data persistence, and external integrations. The architecture follows a modular design with clear separation between the frontend interface, authentication services, and external API integrations.

## Core Components

### UserHub (Primary Component)

The UserHub serves as the central frontend application providing a comprehensive CRUD interface for managing weekly snippets and user configuration.

#### Key Features
- **User Authentication**: Secure login and session management
- **Weekly Snippet Management**: Create, read, update, and delete weekly work summaries
- **Integration Management**: Configure and authenticate external service connections
- **Profile Configuration**: Set user career information and preferences

#### Weekly Snippet Structure
Each weekly snippet is organized by:
- **Week Number**: Calendar week number (e.g., Week 30)
- **Date Range**: Monday to Friday dates (e.g., Jul 21st - Jul 25th)
- **Content**: User-generated summaries of accomplishments and plans

Example: `Week 30 Jul 21st - Jul 25th`

#### User Profile Configuration
The UserHub allows users to optionally configure:
- **Current Seniority Level**: User's specific role and level (e.g., Senior Software Engineer L5)
- **Company Career Ladder**: Complete organizational level structure defining expectations for all engineering levels
- **Performance Feedback**: Insights from previous review cycles to guide future development

### Authentication Services

#### User Authentication
- Secure login/logout functionality
- Session management and token handling
- User profile persistence

#### Integration Authentication
- **Google Calendar OAuth**: Secure connection to Google Calendar for meeting data
- **Todoist OAuth**: Authentication for task management integration
- Token refresh and credential management for external services

### External Integrations

#### Google Calendar Integration
- **Meeting Extraction**: Retrieves scheduled meetings and events
- **Transcription Analysis**: Processes meeting transcriptions for key insights
- **Action Item Detection**: Identifies decisions and follow-up tasks from meetings

#### Todoist Integration
- **Task Synchronization**: Imports completed and pending tasks
- **Project Context**: Understands task organization and project relationships
- **Progress Tracking**: Monitors task completion patterns and productivity metrics

## Data Flow

1. **User Input**: Users create and edit weekly snippets through the UserHub interface
2. **Context Enrichment**: System automatically pulls relevant data from integrated services
3. **Intelligent Analysis**: AI processing combines manual input with extracted context
4. **Career Guidance**: System provides personalized recommendations based on user's current level and company career ladder expectations
5. **Performance Preparation**: Accumulated data supports review cycle documentation

## Deployment Architecture

### Local Development
- **Frontend**: Next.js development server
- **API**: Local serverless functions or Express server
- **Database**: Local PostgreSQL instance or connection to AWS RDS

### Production Deployment
- **Frontend**: Vercel (Next.js)
- **API**: AWS Lambda functions
- **Database**: AWS RDS PostgreSQL
- **Authentication**: AWS Cognito or Auth0
- **File Storage**: AWS S3 (for any uploaded content)

### Technology Stack
- **Frontend**: Next.js 14+ with TypeScript
- **API**: AWS Lambda with Node.js/TypeScript
- **Database**: PostgreSQL on AWS RDS
- **ORM**: Prisma for database management
- **Infrastructure**: AWS CDK or Terraform for IaC
- **Deployment**: Vercel for frontend, AWS SAM/CDK for backend

## System Benefits

- **Centralized Management**: Single interface for all snippet-related activities
- **Automated Context**: Reduces manual effort through intelligent data extraction
- **Career Development**: Provides ongoing guidance aligned with company expectations for user's level
- **Review Readiness**: Maintains comprehensive documentation for performance evaluations
- **Scalable Deployment**: Easy local development with seamless AWS production deployment