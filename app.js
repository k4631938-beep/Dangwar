// Main app file for Village Dangwar community app
import { initAuth } from './auth.js';
import { initPosts } from './posts.js';
import { initUser } from './user.js';
import { toggleView, initializeUI } from './utils.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Village Dangwar Community App Starting...');
    
    // Initialize all modules
    initializeApp();
});

// Initialize the entire application
function initializeApp() {
    try {
        // Initialize UI utilities
        initializeUI();
        
        // Initialize authentication module
        initAuth();
        
        // Initialize posts module
        initPosts();
        
        // Initialize user search module
        initUser();
        
        // Set up navigation
        setupNavigation();
        
        // Set up initial view
        setupInitialView();
        
        console.log('Village Dangwar Community App initialized successfully!');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorMessage('Failed to initialize the application. Please refresh the page.');
    }
}

// Set up navigation between different sections
function setupNavigation() {
    // Get navigation buttons
    const loginBtn = document.getElementById('btn-login');
    const feedBtn = document.getElementById('btn-feed');
    const searchBtn = document.getElementById('btn-search');
    const logoutBtn = document.getElementById('btn-logout');
    
    // Add click event listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            toggleView('auth-section');
        });
    }
    
    if (feedBtn) {
        feedBtn.addEventListener('click', () => {
            toggleView('feed-section');
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            toggleView('search-section');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Logout functionality is handled in auth.js
            console.log('Logout button clicked');
        });
    }
    
    console.log('Navigation setup complete');
}

// Set up the initial view based on authentication state
function setupInitialView() {
    // The initial view will be determined by the auth state change listener
    // in auth.js, so we don't need to do anything here
    console.log('Initial view setup complete');
}

// Show error message to user
function showErrorMessage(message) {
    // Create or update error display
    let errorDiv = document.getElementById('app-error');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'app-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f8d7da;
            color: #721c24;
            padding: 1rem 2rem;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            z-index: 1000;
            max-width: 90%;
            text-align: center;
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }, 5000);
}

// Handle app-wide errors
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showErrorMessage('An unexpected error occurred. Please refresh the page.');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showErrorMessage('An unexpected error occurred. Please refresh the page.');
});

// Export main functions for potential external use
export {
    initializeApp,
    setupNavigation,
    showErrorMessage
};

console.log('App.js loaded successfully');
