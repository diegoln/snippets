const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Serve basic HTML for testing
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Weekly Snippets - Simple Demo</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Weekly Snippets Reminder</h1>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Snippets List -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">Your Snippets</h2>
                    <div class="space-y-3">
                        <div onclick="selectSnippet(30)" class="snippet-item p-3 bg-blue-50 border-blue-200 border rounded-md cursor-pointer" data-week="30">
                            <div class="font-medium text-gray-900">Week 30</div>
                            <div class="text-sm text-gray-600">Jul 21st - Jul 25th</div>
                        </div>
                        <div onclick="selectSnippet(29)" class="snippet-item p-3 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer" data-week="29">
                            <div class="font-medium text-gray-900">Week 29</div>
                            <div class="text-sm text-gray-600">Jul 14th - Jul 18th</div>
                        </div>
                        <div onclick="selectSnippet(28)" class="snippet-item p-3 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer" data-week="28">
                            <div class="font-medium text-gray-900">Week 28</div>
                            <div class="text-sm text-gray-600">Jul 7th - Jul 11th</div>
                        </div>
                        <button class="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400">
                            + Add Current Week
                        </button>
                    </div>
                </div>
            </div>

            <!-- Snippet Editor -->
            <div class="lg:col-span-2">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 id="snippetTitle" class="text-xl font-semibold">Week 30 - Jul 21st - Jul 25th</h2>
                        <button onclick="toggleEdit()" id="editBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Edit
                        </button>
                    </div>

                    <div id="viewMode" class="prose max-w-none">
                        <p id="snippetContent" class="text-gray-700">This week I worked on the user authentication system and completed the API integration for the calendar feature. Made significant progress on the database schema design.</p>
                    </div>

                    <div id="editMode" class="hidden space-y-4">
                        <textarea id="contentEditor" class="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe what you accomplished this week...">This week I worked on the user authentication system and completed the API integration for the calendar feature. Made significant progress on the database schema design.</textarea>
                        
                        <div class="flex gap-3">
                            <button onclick="saveContent()" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                Save
                            </button>
                            <button onclick="cancelEdit()" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let isEditing = false;
        let currentWeek = 30;
        
        // Mock data for different weeks
        const snippets = {
            30: {
                title: 'Week 30 - Jul 21st - Jul 25th',
                content: 'This week I worked on the user authentication system and completed the API integration for the calendar feature. Made significant progress on the database schema design.'
            },
            29: {
                title: 'Week 29 - Jul 14th - Jul 18th',
                content: 'Focused on database schema design and implemented the core CRUD operations for weekly snippets. Started working on the frontend components and user interface design.'
            },
            28: {
                title: 'Week 28 - Jul 7th - Jul 11th',
                content: 'Completed the project setup and initial architecture planning. Set up the development environment and created the basic project structure with Next.js and Prisma.'
            }
        };
        
        function selectSnippet(weekNumber) {
            if (isEditing) {
                if (confirm('You have unsaved changes. Are you sure you want to switch snippets?')) {
                    isEditing = false;
                } else {
                    return;
                }
            }
            
            currentWeek = weekNumber;
            loadSnippet();
            updateSnippetSelection();
        }
        
        function loadSnippet() {
            const snippet = snippets[currentWeek];
            document.getElementById('snippetTitle').textContent = snippet.title;
            document.getElementById('snippetContent').textContent = snippet.content;
            document.getElementById('contentEditor').value = snippet.content;
            
            isEditing = false;
            updateUI();
        }
        
        function updateSnippetSelection() {
            // Remove selection from all items
            document.querySelectorAll('.snippet-item').forEach(item => {
                item.classList.remove('bg-blue-50', 'border-blue-200', 'border');
                item.classList.add('bg-gray-50', 'hover:bg-gray-100');
            });
            
            // Add selection to current item
            const currentItem = document.querySelector('[data-week="' + currentWeek + '"]');
            if (currentItem) {
                currentItem.classList.remove('bg-gray-50', 'hover:bg-gray-100');
                currentItem.classList.add('bg-blue-50', 'border-blue-200', 'border');
            }
        }
        
        function toggleEdit() {
            isEditing = !isEditing;
            updateUI();
        }
        
        function saveContent() {
            const content = document.getElementById('contentEditor').value;
            
            // Update the in-memory data
            snippets[currentWeek].content = content;
            
            // Update the display
            document.getElementById('snippetContent').textContent = content;
            
            isEditing = false;
            updateUI();
            alert('Week ' + currentWeek + ' snippet saved successfully!');
        }
        
        function cancelEdit() {
            // Reset editor to original content
            document.getElementById('contentEditor').value = snippets[currentWeek].content;
            isEditing = false;
            updateUI();
        }
        
        function updateUI() {
            const viewMode = document.getElementById('viewMode');
            const editMode = document.getElementById('editMode');
            const editBtn = document.getElementById('editBtn');
            
            if (isEditing) {
                viewMode.classList.add('hidden');
                editMode.classList.remove('hidden');
                editBtn.textContent = 'Cancel';
            } else {
                viewMode.classList.remove('hidden');
                editMode.classList.add('hidden');
                editBtn.textContent = 'Edit';
            }
        }
        
        // Initialize on page load
        window.onload = function() {
            loadSnippet();
            updateSnippetSelection();
        };
    </script>
</body>
</html>
    `);
    return;
  }
  
  // Return 404 for other requests
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
  console.log(`Access from Windows: http://172.20.155.69:${PORT}/`);
});