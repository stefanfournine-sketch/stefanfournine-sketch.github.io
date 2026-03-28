// 4chan-style Anonymous Board JavaScript

// State
let currentUser = null;
let users = [];
let posts = [];
let comments = [];
let dataFileHandle = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const blogSection = document.getElementById('blog-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');
const postForm = document.getElementById('post-form');
const postFile = document.getElementById('post-file');
const filePreview = document.getElementById('file-preview');
const feedPostsList = document.getElementById('feed-posts-list');
const noFeedPosts = document.getElementById('no-feed-posts');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeSampleData();
    checkAuthState();
    setupEventListeners();
});

// Load all data from localStorage
function loadData() {
    const savedUsers = localStorage.getItem('boardUsers');
    const savedPosts = localStorage.getItem('boardPosts');
    const savedComments = localStorage.getItem('boardComments');
    
    if (savedUsers) users = JSON.parse(savedUsers);
    if (savedPosts) posts = JSON.parse(savedPosts);
    if (savedComments) comments = JSON.parse(savedComments);
}

// Save all data to localStorage and JSON file
function saveData() {
    localStorage.setItem('boardUsers', JSON.stringify(users));
    localStorage.setItem('boardPosts', JSON.stringify(posts));
    localStorage.setItem('boardComments', JSON.stringify(comments));
    
    // Auto-save to JSON file
    autoSaveToFile();
}

// Auto-save to JSON file
async function autoSaveToFile() {
    const data = {
        users: users,
        posts: posts,
        comments: comments,
        lastSaved: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    
    // Try to save using File System Access API
    if (dataFileHandle) {
        try {
            const writable = await dataFileHandle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            console.log('Data saved to file');
            return;
        } catch (error) {
            console.log('Error saving to file:', error);
        }
    }
    
    // Fallback: Save to localStorage (already done above)
    console.log('Data saved to localStorage');
}

// Initialize file handle on first load
async function initFileHandle() {
    if ('showSaveFilePicker' in window) {
        try {
            dataFileHandle = await window.showSaveFilePicker({
                suggestedName: 'board-data.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            console.log('File handle initialized - data will auto-save');
        } catch (error) {
            console.log('User cancelled file picker or error:', error);
        }
    }
}

// Initialize file handle button in header
function initFileHandleButton() {
    // Remove existing button if present
    const existingBtn = document.getElementById('init-file-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Add button to header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        const initBtn = document.createElement('button');
        initBtn.id = 'init-file-btn';
        initBtn.className = 'btn btn-secondary';
        initBtn.textContent = 'Save to File';
        initBtn.addEventListener('click', initFileHandle);
        headerActions.insertBefore(initBtn, headerActions.firstChild);
    }
}

// Initialize sample data
function initializeSampleData() {
    // No sample posts - start with empty board
}

// Check if user is already logged in
function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showBoardSection();
    } else {
        showLoginSection();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Post form
    postForm.addEventListener('submit', handleCreatePost);
    postFile.addEventListener('change', handleFilePreview);
    
    // Navigation
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupSection();
    });
    
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginSection();
    });
    
    // Export button (add to header if exists)
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Clear previous error
    loginError.textContent = '';
    
    // Validate username
    if (!username) {
        loginError.textContent = 'Please enter username';
        return;
    }
    
    // Validate password
    if (!password) {
        loginError.textContent = 'Please enter password';
        return;
    }
    
    // Check if there are any registered users
    if (users.length === 0) {
        loginError.textContent = 'No registered users. Please sign up first.';
        return;
    }
    
    // Find user with EXACT username and password match
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        // Check if username exists but password is wrong
        const userExists = users.find(u => u.username === username);
        if (userExists) {
            loginError.textContent = 'Incorrect password';
        } else {
            loginError.textContent = 'Username not found';
        }
        return;
    }
    
    // Successful login
    currentUser = { username: user.username };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showBoardSection();
    loginForm.reset();
}

// Handle signup (no email required)
function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    // Validation
    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match';
        return;
    }
    
    if (password.length < 3) {
        signupError.textContent = 'Password must be at least 3 characters';
        return;
    }
    
    if (username.length < 1) {
        signupError.textContent = 'Please enter a name';
        return;
    }
    
    // Check if username already exists
    if (users.find(u => u.username === username)) {
        signupError.textContent = 'Username already taken';
        return;
    }
    
    // Create new user
    const newUser = {
        username,
        password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveData();
    
    // Auto login
    currentUser = { username };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    signupForm.reset();
    signupError.textContent = '';
    showBoardSection();
}

// Handle logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginSection();
}

// Show sections
function showLoginSection() {
    loginSection.classList.remove('hidden');
    signupSection.classList.add('hidden');
    blogSection.classList.add('hidden');
}

function showSignupSection() {
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
    blogSection.classList.add('hidden');
}

function showBoardSection() {
    loginSection.classList.add('hidden');
    signupSection.classList.add('hidden');
    blogSection.classList.remove('hidden');
    
    welcomeMessage.textContent = `Posting as: ${currentUser.username}`;
    renderPosts();
}

// Handle create post
async function handleCreatePost(e) {
    e.preventDefault();
    
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const file = postFile.files[0];
    
    if (!title || !content) {
        alert('Please fill in both subject and comment');
        return;
    }
    
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0');
    
    const post = {
        id: Date.now(),
        title,
        content,
        author: currentUser.username,
        date: dateStr,
        file: null
    };
    
    if (file) {
        post.file = await processFile(file);
    }
    
    posts.unshift(post);
    saveData();
    
    postForm.reset();
    filePreview.classList.remove('active');
    filePreview.innerHTML = '';
    
    renderPosts();
}

// Process file
function processFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve({
                name: file.name,
                type: file.type,
                data: e.target.result
            });
        };
        reader.readAsDataURL(file);
    });
}

// Handle file preview
function handleFilePreview(e) {
    const file = e.target.files[0];
    
    if (file) {
        filePreview.classList.add('active');
        filePreview.innerHTML = `<p class="file-name">File: ${file.name}</p>`;
    } else {
        filePreview.classList.remove('active');
        filePreview.innerHTML = '';
    }
}

// Render posts
function renderPosts() {
    if (posts.length === 0) {
        feedPostsList.innerHTML = '';
        noFeedPosts.classList.remove('hidden');
        return;
    }
    
    noFeedPosts.classList.add('hidden');
    feedPostsList.innerHTML = posts.map(post => createPostHTML(post)).join('');
    
    setupPostEventListeners();
}

// Create post HTML
function createPostHTML(post) {
    let fileHTML = '';
    
    if (post.file) {
        if (post.file.type.startsWith('image/')) {
            fileHTML = `<div class="post-file"><img src="${post.file.data}" alt="${post.file.name}"></div>`;
        } else {
            fileHTML = `<div class="post-file"><a href="${post.file.data}" download="${post.file.name}">${post.file.name}</a></div>`;
        }
    }
    
    const postComments = comments.filter(c => c.postId === post.id);
    
    return `
        <article class="post-card">
            <div class="post-header">
                <h3 class="post-title">${escapeHTML(post.title)}</h3>
                <span class="post-date">${post.date}</span>
            </div>
            <p class="post-author">Posted by: ${escapeHTML(post.author)}</p>
            <div class="post-content">${escapeHTML(post.content)}</div>
            ${fileHTML}
            <div class="post-actions">
                <button class="comment-btn" data-post-id="${post.id}">
                    Reply (${postComments.length})
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div class="comments-list">
                    ${postComments.map(c => `
                        <div class="comment">
                            <div class="comment-author">${escapeHTML(c.username)} - ${c.date}</div>
                            <div class="comment-text">${escapeHTML(c.text)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="comment-form">
                    <input type="text" placeholder="Reply..." class="comment-input" data-post-id="${post.id}">
                    <button class="btn btn-primary add-comment-btn" data-post-id="${post.id}">Post</button>
                </div>
            </div>
        </article>
    `;
}

// Setup post event listeners
function setupPostEventListeners() {
    // Comment buttons
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = parseInt(btn.dataset.postId);
            const commentsSection = document.getElementById(`comments-${postId}`);
            commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
        });
    });
    
    // Add comment buttons
    document.querySelectorAll('.add-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = parseInt(btn.dataset.postId);
            const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
            const text = input.value.trim();
            if (text) {
                addComment(postId, text);
                input.value = '';
            }
        });
    });
    
    // Comment input enter key
    document.querySelectorAll('.comment-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const postId = parseInt(input.dataset.postId);
                const text = input.value.trim();
                if (text) {
                    addComment(postId, text);
                    input.value = '';
                }
            }
        });
    });
}

// Add comment
function addComment(postId, text) {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0');
    
    comments.push({
        postId,
        username: currentUser.username,
        text,
        date: dateStr
    });
    
    saveData();
    renderPosts();
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Export data as JSON file
function exportData() {
    const data = {
        users: users,
        posts: posts,
        comments: comments,
        exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'board-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Check if file handle is supported
function isFileSystemAccessSupported() {
    return 'showSaveFilePicker' in window;
}

// Initialize file handle on user action
async function initFileHandle() {
    if (!isFileSystemAccessSupported()) {
        console.log('File System Access API not supported');
        return;
    }
    
    try {
        dataFileHandle = await window.showSaveFilePicker({
            suggestedName: 'board-data.json',
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] }
            }]
        });
        console.log('File handle initialized - data will auto-save');
        
        // Save current data immediately
        autoSaveToFile();
    } catch (error) {
        console.log('User cancelled file picker');
    }
}
