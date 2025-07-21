# System Architecture

## Overview

The Weekly Snippets Reminder system is built around a central UserHub component that manages user interactions, data persistence, and external integrations. The architecture follows a modular design with clear separation between the frontend interface, authentication services, LLM processing, and external API integrations.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    User                                         │
└─────────────────────────┬───────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────────┐
│                            UserHub (Frontend)                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  │
│  │  Weekly Snippets│ │  Profile Config │ │  Integration    │                  │
│  │  CRUD Interface │ │  Management     │ │  Management     │                  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                  │
└─────────────────────────┬───────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────────────┐
│                        Authentication Services                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  │
│  │  User Auth      │ │  Google OAuth   │ │  Todoist OAuth  │                  │
│  │  (NextAuth)     │ │  Integration    │ │  Integration    │                  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                  │
└─────────┬───────────────────────┬───────────────────────┬───────────────────────┘
          │                       │                       │
┌─────────▼───────────┐ ┌─────────▼───────────┐ ┌─────────▼───────────┐
│    PostgreSQL       │ │   Google Calendar   │ │      Todoist        │
│    Database         │ │    Integration      │ │    Integration      │
│  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │
│  │ User Profiles │  │ │  │ Meetings      │  │ │  │ Tasks         │  │
│  │ Weekly Data   │  │ │  │ Transcriptions│  │ │  │ Projects      │  │
│  │ Settings      │  │ │  │ Events        │  │ │  │ Completions   │  │
│  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │
└─────────┬───────────┘ └─────────┬───────────┘ └─────────┬───────────┘
          │                       │                       │
          └───────────────────────▼───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │        LLMProxy           │
                    │   (AI Processing Layer)   │
                    │  ┌─────────────────────┐  │
                    │  │  Document Analysis  │  │
                    │  │  Meeting Processing │  │
                    │  │  Task Understanding │  │
                    │  │  Snippet Generation │  │
                    │  │  Career Guidance    │  │
                    │  └─────────────────────┘  │
                    │           │               │
                    │  ┌─────────▼─────────┐    │
                    │  │   OpenAI API      │    │
                    │  │   Integration     │    │
                    │  └───────────────────┘    │
                    └───────────────────────────┘
```

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

### LLMProxy (AI Processing Component)

The LLMProxy serves as the intelligent processing layer that leverages OpenAI's language models to enhance user experience and provide automated insights.

#### Key Responsibilities
- **Document Analysis**: Extracts meaningful information from uploaded documents, meeting transcriptions, and other text-based content
- **Snippet Generation**: Automatically generates weekly snippet recommendations based on user context, completed tasks, and meeting outcomes
- **Content Enhancement**: Improves user-written snippets with relevant details from integrated data sources
- **Career Guidance**: Provides personalized recommendations aligned with user's seniority level and company career ladder

#### AI Processing Capabilities
- **Meeting Transcription Analysis**: Processes meeting recordings/transcriptions to identify key decisions, action items, and accomplishments
- **Task Context Understanding**: Analyzes Todoist task data to understand project significance and completion impact
- **Document Information Extraction**: Parses uploaded documents (PDFs, Word docs) to extract relevant work accomplishments and project details
- **Contextual Snippet Recommendations**: Generates weekly snippets by combining data from all integrated sources with user's career context

#### Integration Points
- **OpenAI API**: Primary LLM service for text processing and generation
- **UserHub**: Receives processed insights and AI-generated content recommendations
- **External Services**: Processes data from Google Calendar and Todoist integrations
- **File Storage**: Analyzes uploaded documents from AWS S3 or local storage

### External Integrations

#### Google Calendar Integration
- **Meeting Extraction**: Retrieves scheduled meetings and events
- **Transcription Analysis**: Processes meeting transcriptions for key insights via LLMProxy
- **Action Item Detection**: Identifies decisions and follow-up tasks from meetings using AI analysis

#### Todoist Integration
- **Task Synchronization**: Imports completed and pending tasks
- **Project Context**: Understands task organization and project relationships through LLMProxy analysis
- **Progress Tracking**: Monitors task completion patterns and productivity metrics

## Data Flow

1. **User Input**: Users create and edit weekly snippets through the UserHub interface
2. **Document Upload**: Users can upload documents that get processed by LLMProxy for content extraction
3. **Context Enrichment**: System automatically pulls relevant data from Google Calendar and Todoist
4. **LLM Processing**: LLMProxy analyzes all data sources (documents, meetings, tasks) using OpenAI models
5. **Intelligent Analysis**: AI processing combines manual input with extracted context to generate insights
6. **Snippet Recommendations**: LLMProxy provides AI-generated snippet suggestions based on user's weekly activities
7. **Career Guidance**: System provides personalized recommendations based on user's current level and company career ladder expectations
8. **Performance Preparation**: Accumulated data and AI insights support review cycle documentation

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
- **LLM Integration**: OpenAI API for document processing and snippet generation
- **Database**: PostgreSQL on AWS RDS
- **ORM**: Prisma for database management
- **Infrastructure**: AWS CDK or Terraform for IaC
- **Deployment**: Vercel for frontend, AWS SAM/CDK for backend

## System Benefits

- **Modular Architecture**: UserHub operates as a standalone CRUD system, allowing smart functionalities to be added incrementally around the core interface
- **Scalable Deployment**: Seamless transition from local development to AWS production with independent scaling of frontend and backend components
- **Service Separation**: Clear boundaries between authentication, data persistence, and external integrations enable independent development and maintenance
- **Technology Flexibility**: Modern stack with TypeScript throughout ensures maintainability and developer experience
- **Infrastructure as Code**: Automated deployment and configuration management for consistent environments