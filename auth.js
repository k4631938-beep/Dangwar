// Authentication module for Village Dangwar community app
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    showLoading, 
    hideLoading, 
    showError, 
    showSuccess, 
    clearMessages, 
    updateAuthUI,
    isValidEmail,
    isValidPhone,
    sanitizeText
} from './utils.js';

// DOM elements
let loginForm, signupForm, authError, authSuccess;
let showLoginBtn, showSignupBtn;
let logoutBtn;

// Initialize authentication module
export function initAuth() {
    // Get DOM elements
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    authError = document.getElementById('auth-error');
    authSuccess = document.getElementById('auth-success');
    showLoginBtn = document.getElementById('show-login');
    showSignupBtn = document.getElementById('show-signup');
    logoutBtn = document.getElementById('btn-logout');

    // Set up event listeners
    setupEventListeners();
    
    // Monitor authentication state
    monitorAuthState();
    
    console.log('Authentication module initialized');
}

// Set up all event listeners
function setupEventListeners() {
    // Form toggle buttons
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => toggleAuthForm('login'));
    }
    
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => toggleAuthForm('signup'));
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Toggle between login and signup forms
function toggleAuthForm(formType) {
    clearMessages();
    
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        showLoginBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
    } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        showSignupBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
    }
}

// Handle user login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    // Validate inputs
    if (!validateLoginInputs(email, password)) {
        return;
    }
    
    showLoading();
    clearMessages();
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('User logged in successfully:', user.uid);
        showSuccess('auth-success', 'Welcome back! Redirecting to your feed...');
        
        // Clear form
        loginForm.reset();
        
        // Small delay before redirect for better UX
        setTimeout(() => {
            hideLoading();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
        }
        
        showError('auth-error', errorMessage);
    }
}

// Handle user signup
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    
    // Validate inputs
    if (!validateSignupInputs(username, email, phone, password)) {
        return;
    }
    
    showLoading();
    clearMessages();
    
    try {
        // Check if username is already taken
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            hideLoading();
            showError('auth-error', 'Username is already taken. Please choose another one.');
            return;
        }
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        await updateProfile(user, {
            displayName: username
        });
        
        // Create user document in Firestore
        await createUserDocument(user.uid, {
            username: sanitizeText(username),
            email: email,
            phone: phone || null,
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            postsCount: 0,
            bio: '',
            profilePicture: null
        });
        
        console.log('User registered successfully:', user.uid);
        showSuccess('auth-success', 'Account created successfully! Welcome to Village Dangwar!');
        
        // Clear form
        signupForm.reset();
        
        // Small delay before redirect for better UX
        setTimeout(() => {
            hideLoading();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Signup error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters long.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
        }
        
        showError('auth-error', errorMessage);
    }
}

// Handle user logout
async function handleLogout() {
    showLoading();
    
    try {
        await signOut(auth);
        console.log('User logged out successfully');
        showSuccess('auth-success', 'You have been logged out successfully.');
        
        // Clear any cached data
        clearUserData();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Logout error:', error);
        showError('auth-error', 'Failed to logout. Please try again.');
    }
}

// Monitor authentication state changes
function monitorAuthState() {
    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user ? 'logged in' : 'logged out');
        updateAuthUI(user);
        
        if (user) {
            // User is signed in
            loadUserProfile(user.uid);
        } else {
            // User is signed out
            clearUserData();
        }
    });
}

// Validate login inputs
function validateLoginInputs(email, password) {
    if (!email || !password) {
        showError('auth-error', 'Please fill in all required fields.');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('auth-error', 'Please enter a valid email address.');
        return false;
    }
    
    if (password.length < 6) {
        showError('auth-error', 'Password must be at least 6 characters long.');
        return false;
    }
    
    return true;
}

// Validate signup inputs
function validateSignupInputs(username, email, phone, password) {
    if (!username || !email || !password) {
        showError('auth-error', 'Please fill in all required fields.');
        return false;
    }
    
    if (username.length < 3) {
        showError('auth-error', 'Username must be at least 3 characters long.');
        return false;
    }
    
    if (username.length > 20) {
        showError('auth-error', 'Username must be less than 20 characters long.');
        return false;
    }
    
    // Check for valid username characters
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showError('auth-error', 'Username can only contain letters, numbers, and underscores.');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('auth-error', 'Please enter a valid email address.');
        return false;
    }
    
    if (phone && !isValidPhone(phone)) {
        showError('auth-error', 'Please enter a valid phone number.');
        return false;
    }
    
    if (password.length < 6) {
        showError('auth-error', 'Password must be at least 6 characters long.');
        return false;
    }
    
    return true;
}

// Check if username already exists
async function checkUsernameExists(username) {
    try {
        const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
        return usernameDoc.exists();
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// Create user document in Firestore
async function createUserDocument(uid, userData) {
    try {
        // Create user document
        await setDoc(doc(db, 'users', uid), userData);
        
        // Reserve username
        await setDoc(doc(db, 'usernames', userData.username.toLowerCase()), {
            uid: uid,
            username: userData.username,
            createdAt: serverTimestamp()
        });
        
        console.log('User document created successfully');
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

// Load user profile data
async function loadUserProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update user info display
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.textContent = `Welcome, ${userData.username}`;
            }
            
            // Store user data globally for other modules
            window.currentUser = {
                uid: uid,
                ...userData
            };
            
            console.log('User profile loaded:', userData.username);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Clear user data on logout
function clearUserData() {
    window.currentUser = null;
    
    // Clear any cached data or UI elements
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.textContent = '';
    }
}

// Get current user data
export function getCurrentUser() {
    return auth.currentUser;
}

// Get current user profile data
export function getCurrentUserProfile() {
    return window.currentUser || null;
}

// Export authentication functions
export {
    handleLogin,
    handleSignup,
    handleLogout,
    monitorAuthState
};
