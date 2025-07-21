# System Architecture

## Overview

The Weekly Snippets Reminder system is built around a central UserHub component that manages user interactions, data persistence, and external integrations. The architecture follows a modular design with clear separation between the frontend interface, authentication services, LLM processing, and external API integrations.

## Architecture Diagram

![System Architecture](docs/architecture-diagram.svg)

The diagram shows the flow of data and interactions between system components:
- Users interact with the UserHub frontend for all CRUD operations
- Authentication services handle user login and external service OAuth
- Data sources (PostgreSQL, Google Calendar, Todoist) provide information to the system
- LLMProxy acts as a centralized gateway for all OpenAI API interactions

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

### LLMProxy (API Gateway Component)

The LLMProxy serves as a centralized gateway for all OpenAI API interactions, providing a single point of access for LLM operations across the system.

#### Core Responsibilities
- **API Gateway**: Single entry point for all OpenAI API calls from system components
- **Request Management**: Handles rate limiting, retry logic, and request queuing for OpenAI services
- **Security & Authentication**: Manages OpenAI API keys and authentication centrally
- **Response Processing**: Standardizes OpenAI API responses for consistent consumption across the system
- **Error Handling**: Provides robust error handling and fallback mechanisms for API failures

#### Technical Capabilities
- **Request Routing**: Routes different types of LLM requests to appropriate OpenAI models and endpoints
- **Response Caching**: Implements intelligent caching strategies to optimize API usage and reduce costs
- **Token Management**: Monitors and manages token usage across all system requests
- **Request Logging**: Logs all API interactions for debugging, monitoring, and usage analysis
- **Configuration Management**: Handles model selection, temperature settings, and other LLM parameters

#### Integration Points
- **OpenAI API**: Direct integration with OpenAI services (GPT, embeddings, etc.)
- **UserHub**: Receives LLM requests from frontend components
- **External Services**: Processes requests for analyzing data from Google Calendar and Todoist
- **Database**: Stores request logs, usage metrics, and cached responses

### External Integrations

#### Google Calendar Integration
- **Meeting Extraction**: Retrieves scheduled meetings and events
- **Data Synchronization**: Syncs meeting data to system database
- **API Integration**: Handles OAuth authentication and API rate limiting

#### Todoist Integration
- **Task Synchronization**: Imports completed and pending tasks
- **Data Integration**: Syncs task and project data to system database
- **API Management**: Handles OAuth authentication and API interactions

## Data Flow

1. **User Input**: Users create and edit weekly snippets through the UserHub interface
2. **Data Collection**: System automatically pulls relevant data from Google Calendar and Todoist
3. **API Requests**: UserHub and other components make LLM requests through LLMProxy
4. **Request Processing**: LLMProxy handles authentication, rate limiting, and routes requests to OpenAI API
5. **Response Management**: LLMProxy processes OpenAI responses and returns standardized results
6. **Data Integration**: Processed AI insights are integrated back into the user interface and database
7. **Caching & Optimization**: LLMProxy caches responses and manages token usage for cost efficiency

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