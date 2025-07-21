/**
 * Weekly Snippets Reminder - Demo Server
 * 
 * A lightweight HTTP server providing a demonstration of the Weekly Snippets
 * application functionality. This server serves a single-page application
 * that allows users to view, select, and edit weekly work summaries.
 * 
 * Features:
 * - Multi-week snippet management
 * - Real-time editing with persistence
 * - Clean, responsive UI with Tailwind CSS
 * - Proper error handling and validation
 * - Accessibility features (ARIA labels, semantic HTML)
 * 
 * @version 1.0.0
 * @author Weekly Snippets Team
 */

// Node.js core modules
const http = require('http');
const { URL } = require('url');

// Server configuration constants
const CONFIG = {
  PORT: 8080,
  HOST: '0.0.0.0',
  CONTENT_TYPE_HTML: 'text/html; charset=utf-8',
  CONTENT_TYPE_JSON: 'application/json; charset=utf-8',
  CONTENT_TYPE_TEXT: 'text/plain; charset=utf-8'
};

// HTTP status codes for better maintainability
const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

/**
 * Mock data structure for weekly snippets
 * In production, this would be fetched from a database
 * 
 * @type {Object.<number, {title: string, content: string}>}
 */
const MOCK_SNIPPETS = {
  30: {
    title: 'Week 30 - Jul 21st - Jul 25th',
    content: 'This week I worked on the user authentication system and completed the API integration for the calendar feature. Made significant progress on the database schema design and implemented proper error handling throughout the application.'
  },
  29: {
    title: 'Week 29 - Jul 14th - Jul 18th',
    content: 'Focused on database schema design and implemented the core CRUD operations for weekly snippets. Started working on the frontend components and user interface design. Completed the initial project setup and development environment configuration.'
  },
  28: {
    title: 'Week 28 - Jul 7th - Jul 11th',
    content: 'Completed the project setup and initial architecture planning. Set up the development environment and created the basic project structure with Next.js and Prisma. Defined the system requirements and created comprehensive documentation including architecture diagrams.'
  }
};

/**
 * Generate the main HTML page with embedded JavaScript functionality
 * 
 * @returns {string} Complete HTML document as string
 */
function generateHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Snippets - Demo</title>
    <meta name="description" content="Weekly Snippets Reminder - A tool for managing weekly work summaries">
    
    <!-- Tailwind CSS CDN for styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Custom Tailwind configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    animation: {
                        'fade-in': 'fadeIn 0.2s ease-in-out',
                    }
                }
            }
        }
    </script>
    
    <style>
        /* Custom animations and transitions */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.2s ease-in-out;
        }
        
        /* Accessibility improvements */
        .focus-visible:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
        }
        
        /* Tooltip styles */
        .tooltip {
            position: relative;
            display: inline-block;
            cursor: help;
        }
        
        .tooltip:hover::after {
            content: attr(title);
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 8px;
            width: 200px;
            max-width: 200px;
            background-color: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            white-space: normal;
            text-align: left;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: fadeIn 0.2s ease-out;
        }
        
        .tooltip:hover::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 2px;
            border: 6px solid transparent;
            border-bottom-color: #1f2937;
            z-index: 1000;
        }
        
        /* Responsive tooltip adjustments */
        @media (max-width: 640px) {
            .tooltip:hover::after {
                width: 180px;
                max-width: 180px;
                font-size: 11px;
                padding: 6px 10px;
            }
        }
    </style>
</head>
<body class="bg-gray-50 font-sans antialiased">
    <!-- Skip to main content for screen readers -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded-md z-50">
        Skip to main content
    </a>

    <!-- Main Application Container -->
    <div class="min-h-screen bg-gray-50">
        <div class="container mx-auto px-4 py-8 max-w-7xl">
            
            <!-- Application Header -->
            <header class="mb-8 flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        Weekly Snippets Reminder
                    </h1>
                    <p class="text-gray-600">
                        Manage and track your weekly work summaries with ease
                    </p>
                </div>
                <button
                    onclick="openSettings()"
                    class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center space-x-2"
                    aria-label="Open performance cycle settings"
                    id="settings-btn"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                </button>
            </header>
            
            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Snippets Sidebar -->
                <aside class="lg:col-span-1">
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold mb-4 text-gray-900">
                            Your Snippets
                        </h2>
                        
                        <!-- Snippets List -->
                        <nav class="space-y-3" role="navigation" aria-label="Weekly snippets list">
                            ${generateSnippetListItems()}
                            
                            <!-- Add New Week Button -->
                            <button 
                                class="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                aria-label="Add current week snippet"
                                onclick="handleAddNewWeek()"
                            >
                                <span class="text-2xl mr-2">+</span>
                                Add Current Week
                            </button>
                        </nav>
                    </div>
                </aside>

                <!-- Main Content Area -->
                <main id="main-content" class="lg:col-span-2">
                    <div id="snippet-container" class="bg-white rounded-lg shadow-md p-6">
                        <!-- Dynamic content will be loaded here -->
                        <div id="loading-state" class="text-center text-gray-500 py-12">
                            <div class="animate-pulse">
                                <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
                                <div class="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>

        <!-- Settings Modal -->
        <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Performance Cycle Settings</h2>
                        <button
                            onclick="closeSettings()"
                            class="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close settings"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form id="settings-form" class="space-y-6">
                        <!-- Job Title Field -->
                        <div>
                            <label for="jobTitle" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                                Job Title <span class="text-red-500 ml-1">*</span>
                                <div class="tooltip ml-1" title="Your current job title (e.g., Senior Software Engineer, Product Manager).">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </label>
                            <input
                                id="jobTitle"
                                type="text"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Senior Software Engineer"
                            />
                            <div id="jobTitle-error" class="mt-1 text-sm text-red-600 hidden"></div>
                        </div>

                        <!-- Seniority Level Field -->
                        <div>
                            <label for="seniorityLevel" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                                Seniority Level <span class="text-red-500 ml-1">*</span>
                                <div class="tooltip ml-1" title="Your company's level or title (e.g., Senior Engineer, L5, Staff, Principal).">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </label>
                            <input
                                id="seniorityLevel"
                                type="text"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Senior Software Engineer, L5, Staff Engineer, Principal"
                            />
                            <div id="seniorityLevel-error" class="mt-1 text-sm text-red-600 hidden"></div>
                        </div>

                        <!-- Career Ladder Upload -->
                        <div>
                            <label class="flex items-center text-sm font-medium text-gray-700 mb-2">
                                Career Ladder Document <span class="text-gray-500 ml-1">(Optional)</span>
                                <div class="tooltip ml-1" title="Upload your company's career ladder document. PDF, Word, or text files (max 10MB).">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </label>
                            
                            <div class="flex items-center space-x-3">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    class="hidden"
                                    id="careerLadderFile"
                                    onchange="handleFileUpload()"
                                />
                                
                                <label
                                    for="careerLadderFile"
                                    class="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                                >
                                    Choose File
                                </label>
                                
                                <div id="file-info" class="hidden flex items-center space-x-2">
                                    <span id="file-name" class="text-sm text-gray-600"></span>
                                    <button
                                        type="button"
                                        onclick="removeFile()"
                                        class="text-red-500 hover:text-red-700 transition-colors"
                                        aria-label="Remove file"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div id="file-error" class="mt-1 text-sm text-red-600 hidden"></div>
                        </div>

                        <!-- Performance Feedback Field -->
                        <div>
                            <label class="flex items-center text-sm font-medium text-gray-700 mb-2">
                                Previous Performance Feedback <span class="text-gray-500 ml-1">(Optional)</span>
                                <div class="tooltip ml-1" title="Upload review document OR paste text below. File takes priority over text.">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </label>
                            
                            <!-- File Upload Option -->
                            <div class="mb-4">
                                <div class="flex items-center space-x-3 mb-2">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt"
                                        class="hidden"
                                        id="performanceFeedbackFile"
                                        onchange="handlePerformanceFeedbackFileUpload()"
                                    />
                                    
                                    <label
                                        for="performanceFeedbackFile"
                                        class="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors text-sm"
                                    >
                                        📄 Upload Feedback Document
                                    </label>
                                    
                                    <div id="feedback-file-info" class="hidden flex items-center space-x-2">
                                        <span id="feedback-file-name" class="text-sm text-green-600 font-medium"></span>
                                        <button
                                            type="button"
                                            onclick="removePerformanceFeedbackFile()"
                                            class="text-red-500 hover:text-red-700 transition-colors"
                                            aria-label="Remove feedback file"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <div id="feedback-file-error" class="text-sm text-red-600 hidden"></div>
                            </div>

                            <!-- Text Input Option -->
                            <div class="relative">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm text-gray-600">Or paste feedback text:</span>
                                    <span id="feedback-priority-indicator" class="text-xs text-amber-600 font-medium hidden">
                                        📄 File uploaded - text will be ignored
                                    </span>
                                </div>
                                <textarea
                                    id="performanceFeedback"
                                    rows="6"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Paste feedback from your last performance review, including strengths, areas for improvement, and goals..."
                                ></textarea>
                            </div>
                            
                            <p class="mt-2 text-xs text-gray-500">
                                💡 <strong>Priority:</strong> If you upload a file, it will be used instead of the text field. 
                                This information helps generate more relevant snippet suggestions.
                            </p>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onclick="closeSettings()"
                                class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Application Logic -->
    <script>
        ${generateJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for snippet list items
 * 
 * @returns {string} HTML string for snippet navigation items
 */
function generateSnippetListItems() {
  return Object.keys(MOCK_SNIPPETS)
    .sort((a, b) => b - a) // Sort in descending order (newest first)
    .map(weekNumber => {
      const snippet = MOCK_SNIPPETS[weekNumber];
      const isFirst = weekNumber === Object.keys(MOCK_SNIPPETS).sort((a, b) => b - a)[0];
      
      return `
        <button
            onclick="selectSnippet(${weekNumber})"
            class="snippet-item w-full text-left p-3 rounded-md cursor-pointer transition-colors ${isFirst ? 'bg-blue-50 border-blue-200 border' : 'bg-gray-50 hover:bg-gray-100'}"
            data-week="${weekNumber}"
            aria-pressed="${isFirst ? 'true' : 'false'}"
            role="button"
        >
            <div class="font-medium text-gray-900">
                Week ${weekNumber}
            </div>
            <div class="text-sm text-gray-600">
                ${snippet.title.split(' - ')[1]}
            </div>
        </button>`;
    }).join('');
}

/**
 * Generate JavaScript application logic
 * 
 * @returns {string} JavaScript code as string
 */
function generateJavaScript() {
  return `
    /**
     * Application State Management
     */
    const AppState = {
        currentWeek: 30,
        isEditing: false,
        snippets: ${JSON.stringify(MOCK_SNIPPETS)},
        hasUnsavedChanges: false,
        settings: {
            jobTitle: '',
            seniorityLevel: '',
            careerLadderFile: null,
            performanceFeedback: '',
            performanceFeedbackFile: null
        }
    };

    /**
     * DOM References (cached for performance)
     */
    const DOMRefs = {
        snippetContainer: null,
        loadingState: null
    };

    /**
     * Initialize the application when DOM is loaded
     */
    function initializeApp() {
        // Cache DOM references
        DOMRefs.snippetContainer = document.getElementById('snippet-container');
        DOMRefs.loadingState = document.getElementById('loading-state');
        
        // Load initial snippet
        selectSnippet(AppState.currentWeek);
        
        // Set up keyboard event listeners
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Warn about unsaved changes when leaving page
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Set up settings form event listener
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', handleSettingsSubmit);
        }
        
        console.log('Weekly Snippets Demo initialized');
    }

    /**
     * Handle snippet selection from sidebar
     * 
     * @param {number} weekNumber - Week number to select
     */
    function selectSnippet(weekNumber) {
        // Check for unsaved changes
        if (AppState.isEditing && AppState.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to switch snippets?')) {
                return;
            }
        }
        
        // Update application state
        AppState.currentWeek = parseInt(weekNumber, 10);
        AppState.isEditing = false;
        AppState.hasUnsavedChanges = false;
        
        // Update UI
        loadSnippetContent();
        updateSnippetSelection();
        
        // Announce to screen readers
        announceToScreenReader('Selected week ' + weekNumber + ' snippet');
    }

    /**
     * Load and display snippet content
     */
    function loadSnippetContent() {
        const snippet = AppState.snippets[AppState.currentWeek];
        
        if (!snippet) {
            console.error('Snippet not found for week:', AppState.currentWeek);
            return;
        }

        const contentHTML = generateSnippetContentHTML(snippet);
        DOMRefs.snippetContainer.innerHTML = contentHTML;
        
        // Add fade-in animation
        DOMRefs.snippetContainer.classList.add('fade-in');
    }

    /**
     * Generate HTML for snippet content area
     * 
     * @param {Object} snippet - Snippet data object
     * @returns {string} HTML content string
     */
    function generateSnippetContentHTML(snippet) {
        return \`
            <!-- Snippet Header -->
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 class="text-xl font-semibold text-gray-900" id="snippet-title">
                    \${snippet.title}
                </h2>
                <button
                    onclick="toggleEditMode()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                    aria-label="\${AppState.isEditing ? 'Cancel editing' : 'Edit snippet'}"
                    id="edit-toggle-btn"
                >
                    \${AppState.isEditing ? 'Cancel' : 'Edit'}
                </button>
            </header>

            <!-- Content Display Area -->
            <div id="content-area" class="min-h-64">
                \${AppState.isEditing ? generateEditorHTML(snippet.content) : generateViewerHTML(snippet.content)}
            </div>
        \`;
    }

    /**
     * Generate HTML for content viewer (read-only mode)
     * 
     * @param {string} content - Snippet content
     * @returns {string} HTML for viewer
     */
    function generateViewerHTML(content) {
        return \`
            <div class="prose max-w-none">
                <div class="text-gray-700 whitespace-pre-wrap leading-relaxed text-base" id="snippet-content">
                    \${escapeHTML(content)}
                </div>
            </div>
        \`;
    }

    /**
     * Generate HTML for content editor
     * 
     * @param {string} content - Snippet content
     * @returns {string} HTML for editor
     */
    function generateEditorHTML(content) {
        return \`
            <div class="space-y-4">
                <!-- Content Editor Textarea -->
                <div class="relative">
                    <textarea
                        id="content-editor"
                        class="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                        placeholder="Describe what you accomplished this week and your plans for next week..."
                        aria-label="Snippet content editor"
                        oninput="handleContentChange()"
                    >\${escapeHTML(content)}</textarea>
                    
                    <!-- Character count -->
                    <div class="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        <span id="char-count">0</span> characters
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3">
                    <button
                        onclick="saveContent()"
                        class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
                        aria-label="Save snippet changes"
                        id="save-btn"
                    >
                        💾 Save
                    </button>
                    <button
                        onclick="cancelEdit()"
                        class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                        aria-label="Cancel editing"
                    >
                        ✕ Cancel
                    </button>
                    <button
                        onclick="clearContent()"
                        class="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
                        aria-label="Clear all content"
                    >
                        🗑️ Clear
                    </button>
                </div>
            </div>
        \`;
    }

    /**
     * Toggle between edit and view modes
     */
    function toggleEditMode() {
        AppState.isEditing = !AppState.isEditing;
        AppState.hasUnsavedChanges = false;
        
        loadSnippetContent();
        
        // Focus on textarea when entering edit mode
        if (AppState.isEditing) {
            setTimeout(() => {
                const editor = document.getElementById('content-editor');
                if (editor) {
                    editor.focus();
                    updateCharacterCount();
                }
            }, 100);
        }
        
        announceToScreenReader(AppState.isEditing ? 'Entered edit mode' : 'Exited edit mode');
    }

    /**
     * Handle content changes in the editor
     */
    function handleContentChange() {
        AppState.hasUnsavedChanges = true;
        updateCharacterCount();
        updateSaveButtonState();
    }

    /**
     * Update character count display
     */
    function updateCharacterCount() {
        const editor = document.getElementById('content-editor');
        const counter = document.getElementById('char-count');
        
        if (editor && counter) {
            counter.textContent = editor.value.length;
        }
    }

    /**
     * Update save button state based on content changes
     */
    function updateSaveButtonState() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.classList.toggle('bg-green-600', AppState.hasUnsavedChanges);
            saveBtn.classList.toggle('bg-gray-400', !AppState.hasUnsavedChanges);
        }
    }

    /**
     * Save snippet content
     */
    function saveContent() {
        const editor = document.getElementById('content-editor');
        
        if (!editor) {
            console.error('Editor not found');
            return;
        }
        
        const content = editor.value.trim();
        
        // Validate content
        if (!content) {
            alert('Please enter some content before saving.');
            editor.focus();
            return;
        }
        
        // Update snippet data
        AppState.snippets[AppState.currentWeek].content = content;
        
        // Reset state
        AppState.isEditing = false;
        AppState.hasUnsavedChanges = false;
        
        // Reload content
        loadSnippetContent();
        
        // Show success message
        showNotification('Week ' + AppState.currentWeek + ' snippet saved successfully!', 'success');
        
        announceToScreenReader('Snippet saved successfully');
    }

    /**
     * Cancel editing and discard changes
     */
    function cancelEdit() {
        if (AppState.hasUnsavedChanges) {
            if (!confirm('Are you sure you want to discard your changes?')) {
                return;
            }
        }
        
        AppState.isEditing = false;
        AppState.hasUnsavedChanges = false;
        
        loadSnippetContent();
        announceToScreenReader('Editing cancelled');
    }

    /**
     * Clear all content in the editor
     */
    function clearContent() {
        if (!confirm('Are you sure you want to clear all content?')) {
            return;
        }
        
        const editor = document.getElementById('content-editor');
        if (editor) {
            editor.value = '';
            editor.focus();
            handleContentChange();
        }
    }

    /**
     * Update visual selection state of snippet items
     */
    function updateSnippetSelection() {
        // Remove selection from all items
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.remove('bg-blue-50', 'border-blue-200', 'border');
            item.classList.add('bg-gray-50', 'hover:bg-gray-100');
            item.setAttribute('aria-pressed', 'false');
        });
        
        // Add selection to current item
        const currentItem = document.querySelector('[data-week="' + AppState.currentWeek + '"]');
        if (currentItem) {
            currentItem.classList.remove('bg-gray-50', 'hover:bg-gray-100');
            currentItem.classList.add('bg-blue-50', 'border-blue-200', 'border');
            currentItem.setAttribute('aria-pressed', 'true');
        }
    }

    /**
     * Handle keyboard shortcuts
     * 
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (AppState.isEditing) {
                saveContent();
            }
        }
        
        // Escape to cancel editing
        if (event.key === 'Escape' && AppState.isEditing) {
            cancelEdit();
        }
        
        // Ctrl/Cmd + E to toggle edit mode
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            toggleEditMode();
        }
    }

    /**
     * Handle before page unload (warn about unsaved changes)
     * 
     * @param {Event} event - Before unload event
     */
    function handleBeforeUnload(event) {
        if (AppState.hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Handle adding new week (placeholder functionality)
     */
    function handleAddNewWeek() {
        alert('Add new week functionality would be implemented here.\\n\\nThis would typically:\\n- Calculate current week number\\n- Create new snippet entry\\n- Switch to edit mode for the new snippet');
    }

    /**
     * Open settings modal
     */
    function openSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Load current settings
            loadSettingsData();
            
            // Focus on first input
            setTimeout(() => {
                const firstInput = document.getElementById('jobTitle');
                if (firstInput) firstInput.focus();
            }, 100);
            
            announceToScreenReader('Settings modal opened');
        }
    }

    /**
     * Close settings modal
     */
    function closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
            clearSettingsErrors();
            announceToScreenReader('Settings modal closed');
        }
    }

    /**
     * Load settings data into form
     */
    function loadSettingsData() {
        const jobTitleInput = document.getElementById('jobTitle');
        const senioritySelect = document.getElementById('seniorityLevel');
        const feedbackTextarea = document.getElementById('performanceFeedback');
        
        if (jobTitleInput) jobTitleInput.value = AppState.settings.jobTitle;
        if (senioritySelect) senioritySelect.value = AppState.settings.seniorityLevel;
        if (feedbackTextarea) feedbackTextarea.value = AppState.settings.performanceFeedback;
        
        // Update file display if files were previously selected
        if (AppState.settings.careerLadderFile) {
            showFileInfo(AppState.settings.careerLadderFile);
        }
        
        if (AppState.settings.performanceFeedbackFile) {
            showPerformanceFeedbackFileInfo(AppState.settings.performanceFeedbackFile);
            updateFeedbackPriorityIndicator(true);
        }
    }

    /**
     * Handle file upload
     */
    function handleFileUpload() {
        const fileInput = document.getElementById('careerLadderFile');
        const fileError = document.getElementById('file-error');
        
        if (!fileInput.files || !fileInput.files[0]) {
            return;
        }
        
        const file = fileInput.files[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            fileError.textContent = 'Please upload a PDF, Word document, or text file';
            fileError.classList.remove('hidden');
            fileInput.value = '';
            return;
        }
        
        // Validate file size
        if (file.size > maxSize) {
            fileError.textContent = 'File size must be less than 10MB';
            fileError.classList.remove('hidden');
            fileInput.value = '';
            return;
        }
        
        // File is valid
        fileError.classList.add('hidden');
        AppState.settings.careerLadderFile = file.name;
        showFileInfo(file.name);
    }

    /**
     * Show file information
     */
    function showFileInfo(fileName) {
        const fileInfo = document.getElementById('file-info');
        const fileNameSpan = document.getElementById('file-name');
        
        if (fileInfo && fileNameSpan) {
            fileNameSpan.textContent = fileName;
            fileInfo.classList.remove('hidden');
        }
    }

    /**
     * Remove uploaded file
     */
    function removeFile() {
        const fileInput = document.getElementById('careerLadderFile');
        const fileInfo = document.getElementById('file-info');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.classList.add('hidden');
        
        AppState.settings.careerLadderFile = null;
    }

    /**
     * Handle performance feedback file upload
     */
    function handlePerformanceFeedbackFileUpload() {
        const fileInput = document.getElementById('performanceFeedbackFile');
        const fileError = document.getElementById('feedback-file-error');
        
        if (!fileInput.files || !fileInput.files[0]) {
            return;
        }
        
        const file = fileInput.files[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
            fileError.textContent = 'Please upload a PDF, Word document, or text file';
            fileError.classList.remove('hidden');
            fileInput.value = '';
            return;
        }
        
        // Validate file size
        if (file.size > maxSize) {
            fileError.textContent = 'File size must be less than 10MB';
            fileError.classList.remove('hidden');
            fileInput.value = '';
            return;
        }
        
        // File is valid
        fileError.classList.add('hidden');
        AppState.settings.performanceFeedbackFile = file.name;
        showPerformanceFeedbackFileInfo(file.name);
        updateFeedbackPriorityIndicator(true);
    }

    /**
     * Show performance feedback file information
     */
    function showPerformanceFeedbackFileInfo(fileName) {
        const fileInfo = document.getElementById('feedback-file-info');
        const fileNameSpan = document.getElementById('feedback-file-name');
        
        if (fileInfo && fileNameSpan) {
            fileNameSpan.textContent = fileName;
            fileInfo.classList.remove('hidden');
        }
    }

    /**
     * Remove performance feedback file
     */
    function removePerformanceFeedbackFile() {
        const fileInput = document.getElementById('performanceFeedbackFile');
        const fileInfo = document.getElementById('feedback-file-info');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.classList.add('hidden');
        
        AppState.settings.performanceFeedbackFile = null;
        updateFeedbackPriorityIndicator(false);
    }

    /**
     * Update the feedback priority indicator
     */
    function updateFeedbackPriorityIndicator(hasFile) {
        const indicator = document.getElementById('feedback-priority-indicator');
        const textarea = document.getElementById('performanceFeedback');
        
        if (indicator) {
            if (hasFile) {
                indicator.classList.remove('hidden');
                if (textarea) {
                    textarea.classList.add('opacity-60');
                    textarea.setAttribute('placeholder', 'File uploaded - this text field will be ignored');
                }
            } else {
                indicator.classList.add('hidden');
                if (textarea) {
                    textarea.classList.remove('opacity-60');
                    textarea.setAttribute('placeholder', 'Paste feedback from your last performance review, including strengths, areas for improvement, and goals...');
                }
            }
        }
    }

    /**
     * Validate settings form
     */
    function validateSettings() {
        let isValid = true;
        const errors = {};
        
        // Job title validation
        const jobTitle = document.getElementById('jobTitle').value.trim();
        if (!jobTitle) {
            errors.jobTitle = 'Job title is required';
            isValid = false;
        }
        
        // Seniority level validation
        const seniorityLevel = document.getElementById('seniorityLevel').value.trim();
        if (!seniorityLevel) {
            errors.seniorityLevel = 'Please enter your seniority level';
            isValid = false;
        }
        
        // Display errors
        displaySettingsErrors(errors);
        
        return isValid;
    }

    /**
     * Display settings form errors
     */
    function displaySettingsErrors(errors) {
        // Clear previous errors
        clearSettingsErrors();
        
        // Show new errors
        Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(field + '-error');
            const inputElement = document.getElementById(field);
            
            if (errorElement && inputElement) {
                errorElement.textContent = errors[field];
                errorElement.classList.remove('hidden');
                inputElement.classList.add('border-red-300');
                inputElement.classList.remove('border-gray-300');
            }
        });
    }

    /**
     * Clear settings form errors
     */
    function clearSettingsErrors() {
        const errorFields = ['jobTitle', 'seniorityLevel'];
        
        errorFields.forEach(field => {
            const errorElement = document.getElementById(field + '-error');
            const inputElement = document.getElementById(field);
            
            if (errorElement) {
                errorElement.classList.add('hidden');
            }
            
            if (inputElement) {
                inputElement.classList.remove('border-red-300');
                inputElement.classList.add('border-gray-300');
            }
        });
    }

    /**
     * Handle settings form submission
     */
    function handleSettingsSubmit(event) {
        event.preventDefault();
        
        if (!validateSettings()) {
            return;
        }
        
        // Save settings
        AppState.settings.jobTitle = document.getElementById('jobTitle').value.trim();
        AppState.settings.seniorityLevel = document.getElementById('seniorityLevel').value.trim();
        AppState.settings.performanceFeedback = document.getElementById('performanceFeedback').value.trim();
        // Note: performanceFeedbackFile and careerLadderFile are already saved when uploaded
        
        // Close modal
        closeSettings();
        
        // Show success message
        showNotification('Settings saved successfully!', 'success');
        
        console.log('Settings saved:', AppState.settings);
    }

    /**
     * Show notification message
     * 
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'info')
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = \`fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in \${getNotificationClasses(type)}\`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Get CSS classes for notification types
     * 
     * @param {string} type - Notification type
     * @returns {string} CSS classes
     */
    function getNotificationClasses(type) {
        const classes = {
            'success': 'bg-green-600 text-white',
            'error': 'bg-red-600 text-white',
            'info': 'bg-blue-600 text-white',
            'warning': 'bg-yellow-600 text-white'
        };
        
        return classes[type] || classes.info;
    }

    /**
     * Announce message to screen readers
     * 
     * @param {string} message - Message to announce
     */
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Escape HTML characters to prevent XSS
     * 
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
    `;
}

/**
 * Create and configure the HTTP server
 * 
 * @param {http.IncomingMessage} req - Request object
 * @param {http.ServerResponse} res - Response object
 */
function createServer(req, res) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Use modern URL API instead of deprecated url.parse
  const urlObject = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObject.pathname;
  
  // Log request
  console.log(`${timestamp} - ${req.method} ${pathname} - ${req.headers['user-agent'] || 'Unknown'}`);
  
  try {
    // Handle root path and index.html
    if (pathname === '/' || pathname === '/index.html') {
      const html = generateHTML();
      
      res.writeHead(HTTP_STATUS.OK, {
        'Content-Type': CONFIG.CONTENT_TYPE_HTML,
        'Content-Length': Buffer.byteLength(html),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`
      });
      
      res.end(html);
      return;
    }
    
    // Handle favicon requests
    if (pathname === '/favicon.ico') {
      res.writeHead(HTTP_STATUS.NOT_FOUND, {
        'Content-Type': CONFIG.CONTENT_TYPE_TEXT
      });
      res.end('Not found');
      return;
    }
    
    // Handle health check
    if (pathname === '/health') {
      const healthData = JSON.stringify({
        status: 'healthy',
        timestamp: timestamp,
        uptime: process.uptime(),
        version: '1.0.0'
      });
      
      res.writeHead(HTTP_STATUS.OK, {
        'Content-Type': CONFIG.CONTENT_TYPE_JSON,
        'Content-Length': Buffer.byteLength(healthData)
      });
      
      res.end(healthData);
      return;
    }
    
    // Return 404 for other requests
    res.writeHead(HTTP_STATUS.NOT_FOUND, {
      'Content-Type': CONFIG.CONTENT_TYPE_TEXT
    });
    res.end('Not found');
    
  } catch (error) {
    console.error(`${timestamp} - Server error:`, error);
    
    res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      'Content-Type': CONFIG.CONTENT_TYPE_TEXT
    });
    res.end('Internal server error');
  }
}

// Create and start the server
const server = http.createServer(createServer);

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Start the server
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('====================================');
  console.log('Weekly Snippets Demo Server Started');
  console.log('====================================');
  console.log(`Server: http://${CONFIG.HOST}:${CONFIG.PORT}/`);
  console.log(`Local:  http://localhost:${CONFIG.PORT}/`);
  console.log(`Health: http://${CONFIG.HOST}:${CONFIG.PORT}/health`);
  console.log('====================================');
});

// Export for testing purposes
module.exports = { server, CONFIG, HTTP_STATUS };