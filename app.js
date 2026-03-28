// GitHub Configuration
const GITHUB_CONFIG = {
    owner: 'YOUR_GITHUB_USERNAME', // Replace with your GitHub username
    repo: 'YOUR_REPO_NAME', // Replace with your repository name
    branch: 'main', // or 'master'
    dataFile: 'data.json',
    token: '' // Optional: Add GitHub personal access token for write access
};

// State
let currentUser = null;
let users = [];
let posts = [];
let comments = [];

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
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    checkAuthState();
    setupEventListeners();
});

// Get raw GitHub URL for data file
function getRawUrl() {
    return `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.dataFile}`;
}

// Load all data from GitHub or localStorage
async function loadData() {
    try {
        const response = await fetch(getRawUrl() + '?' + Date.now());
        if (response.ok) {
            const data = await response.json();
            users = data.users || [];
            posts = data.posts || [];
            comments = data.comments || [];
            console.log('Data loaded from GitHub');
        } else {
            console.log('No data file found, starting fresh');
            loadFromLocalStorage();
        }
    } catch (error) {
        console.log('Error loading from GitHub, using localStorage:', error);
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const savedUsers = localStorage.getItem('boardUsers');
    const savedPosts = localStorage.getItem('boardPosts');
    const savedComments = localStorage.getItem('boardComments');
    
    if (savedUsers) users = JSON.parse(savedUsers);
    if (savedPosts) posts = JSON.parse(savedPosts);
    if (savedComments) comments = JSON.parse(savedComments);
}

// Save all data
async function saveData() {
    // Save to localStorage as backup
    localStorage.setItem('boardUsers', JSON.stringify(users));
    localStorage.setItem('boardPosts', JSON.stringify(posts));
    localStorage.setItem('boardComments', JSON.stringify(comments));
    
    // Try to save to GitHub if token is provided
    if (GITHUB_CONFIG.token) {
        await saveToGitHub();
    }
}

// Save to GitHub using API
async function saveToGitHub() {
    const data = {
        users: users,
        posts: posts,
        comments: comments,
        lastUpdated: new Date().toISOString()
    };
    
    try {
        // Get current file to get its SHA
        const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = null;
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }
        
        // Update or create file
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const updateUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dataFile}`;
        
        const body = {
            message: `Update data - ${new Date().toISOString()}`,
            content: content,
            branch: GITHUB_CONFIG.branch
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        console.log('Data saved to GitHub');
    } catch (error) {
        console.error('Error saving to GitHub:', error);
    }
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
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);
    postForm.addEventListener('submit', handleCreatePost);
    postFile.addEventListener('change', handleFilePreview);
    
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupSection();
    });
    
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginSection();
    });
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    loginError.textContent = '';
    
    if (!username || !password) {
        loginError.textContent = 'Please enter username and password';
        return;
    }
    
    if (users.length === 0) {
        loginError.textContent = 'No registered users. Please sign up first.';
        return;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        const userExists = users.find(u => u.username === username);
        if (userExists) {
            loginError.textContent = 'Incorrect password';
        } else {
            loginError.textContent = 'Username not found';
        }
        return;
    }
    
    currentUser = { username: user.username };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showBoardSection();
    loginForm.reset();
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
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
    
    if (users.find(u => u.username === username)) {
        signupError.textContent = 'Username already taken';
        return;
    }
    
    const newUser = {
        username,
        password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await saveData();
    
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
        createdAt: now.getTime(),
        file: null
    };
    
    if (file) {
        post.file = await processFile(file);
    }
    
    posts.unshift(post);
    await saveData();
    
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
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.postId;
            const commentsSection = document.getElementById(`comments-${postId}`);
            commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
        });
    });
    
    document.querySelectorAll('.add-comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.postId;
            const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
            const text = input.value.trim();
            if (text) {
                addComment(postId, text);
                input.value = '';
            }
        });
    });
    
    document.querySelectorAll('.comment-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const postId = input.dataset.postId;
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
async function addComment(postId, text) {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0');
    
    const comment = {
        id: Date.now(),
        postId,
        username: currentUser.username,
        text,
        date: dateStr,
        createdAt: now.getTime()
    };
    
    comments.push(comment);
    await saveData();
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
    link.download = 'data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}