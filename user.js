// User module for Village Dangwar community app - handles search and follow functionality
import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    showLoading, 
    hideLoading, 
    showError, 
    showSuccess, 
    clearMessages,
    debounce
} from './utils.js';

// DOM elements
let searchInput, searchButton, searchResults, searchError;

// Initialize user module
export function initUser() {
    searchInput = document.getElementById('search-input');
    searchButton = document.getElementById('search-button');
    searchResults = document.getElementById('search-results');
    searchError = document.getElementById('search-error');

    setupEventListeners();
    
    console.log('User module initialized');
}

// Set up event listeners
function setupEventListeners() {
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Add debounced search as user types
        const debouncedSearch = debounce(handleSearch, 500);
        searchInput.addEventListener('input', debouncedSearch);
    }
}

// Handle user search
async function handleSearch() {
    const keyword = searchInput.value.trim();
    
    // Clear previous results
    searchResults.innerHTML = '';
    clearMessages();
    
    if (!keyword) {
        searchResults.innerHTML = '<div class="no-results">Enter a username to search for people in your community</div>';
        return;
    }
    
    if (keyword.length < 2) {
        showError('search-error', 'Please enter at least 2 characters to search.');
        return;
    }
    
    showLoading();
    
    try {
        // Search for users by username (case-insensitive)
        const usersRef = collection(db, 'users');
        const usersQuery = query(
            usersRef, 
            where('username', '>=', keyword.toLowerCase()),
            where('username', '<=', keyword.toLowerCase() + '\uf8ff')
        );
        
        const querySnapshot = await getDocs(usersQuery);
        
        hideLoading();
        
        if (querySnapshot.empty) {
            searchResults.innerHTML = '<div class="no-results">No users found with that username.</div>';
            return;
        }
        
        // Get current user's following list
        const currentUser = auth.currentUser;
        let currentUserFollowing = [];
        
        if (currentUser) {
            const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (currentUserDoc.exists()) {
                currentUserFollowing = currentUserDoc.data().following || [];
            }
        }
        
        // Render search results
        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;
            
            // Don't show current user in search results
            if (currentUser && userId === currentUser.uid) {
                return;
            }
            
            renderUserResult(userId, userData, currentUserFollowing.includes(userId));
        });
        
        if (searchResults.children.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No other users found with that username.</div>';
        }
        
    } catch (error) {
        hideLoading();
        console.error('Search error:', error);
        showError('search-error', 'Failed to search users. Please try again.');
    }
}

// Render a single user result
function renderUserResult(userId, userData, isFollowing) {
    const userResult = document.createElement('div');
    userResult.classList.add('user-result');
    userResult.dataset.userId = userId;
    
    const followersCount = userData.followers ? userData.followers.length : 0;
    const postsCount = userData.postsCount || 0;
    
    userResult.innerHTML = `
        <div class="user-info-result">
            <div class="username">@${userData.username}</div>
            <div class="user-email">${userData.email}</div>
            <div class="user-stats">
                <span>${postsCount} posts</span> • 
                <span>${followersCount} followers</span>
            </div>
        </div>
        <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                onclick="toggleFollow('${userId}', this)">
            ${isFollowing ? 'Following' : 'Follow'}
        </button>
    `;
    
    searchResults.appendChild(userResult);
}

// Toggle follow/unfollow
window.toggleFollow = async function(targetUserId, buttonElement) {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        showError('search-error', 'You must be logged in to follow users.');
        return;
    }
    
    if (targetUserId === currentUser.uid) {
        showError('search-error', 'You cannot follow yourself.');
        return;
    }
    
    const originalText = buttonElement.textContent;
    buttonElement.disabled = true;
    buttonElement.textContent = 'Processing...';
    
    try {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const targetUserRef = doc(db, 'users', targetUserId);
        
        // Get current user's data to check if already following
        const currentUserDoc = await getDoc(currentUserRef);
        const currentUserData = currentUserDoc.data();
        const following = currentUserData.following || [];
        
        const isCurrentlyFollowing = following.includes(targetUserId);
        
        if (isCurrentlyFollowing) {
            // Unfollow
            await updateDoc(currentUserRef, {
                following: arrayRemove(targetUserId)
            });
            
            await updateDoc(targetUserRef, {
                followers: arrayRemove(currentUser.uid)
            });
            
            buttonElement.textContent = 'Follow';
            buttonElement.classList.remove('following');
            
            showSuccess('search-error', 'User unfollowed successfully.');
            
        } else {
            // Follow
            await updateDoc(currentUserRef, {
                following: arrayUnion(targetUserId)
            });
            
            await updateDoc(targetUserRef, {
                followers: arrayUnion(currentUser.uid)
            });
            
            buttonElement.textContent = 'Following';
            buttonElement.classList.add('following');
            
            showSuccess('search-error', 'User followed successfully.');
        }
        
        // Update follower count in UI
        const userResult = buttonElement.closest('.user-result');
        const statsElement = userResult.querySelector('.user-stats');
        if (statsElement) {
            // Refresh the user result to show updated follower count
            const targetUserDoc = await getDoc(targetUserRef);
            if (targetUserDoc.exists()) {
                const updatedUserData = targetUserDoc.data();
                const followersCount = updatedUserData.followers ? updatedUserData.followers.length : 0;
                const postsCount = updatedUserData.postsCount || 0;
                
                statsElement.innerHTML = `
                    <span>${postsCount} posts</span> • 
                    <span>${followersCount} followers</span>
                `;
            }
        }
        
    } catch (error) {
        console.error('Follow/unfollow error:', error);
        showError('search-error', 'Failed to update follow status. Please try again.');
        
        // Restore original button state
        buttonElement.textContent = originalText;
        
    } finally {
        buttonElement.disabled = false;
    }
};

// Get user's followers
export async function getUserFollowers(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data().followers || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting followers:', error);
        return [];
    }
}

// Get user's following
export async function getUserFollowing(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data().following || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting following:', error);
        return [];
    }
}

// Search users by partial username match
export async function searchUsersByUsername(searchTerm) {
    try {
        const usersRef = collection(db, 'users');
        const usersQuery = query(
            usersRef,
            where('username', '>=', searchTerm.toLowerCase()),
            where('username', '<=', searchTerm.toLowerCase() + '\uf8ff')
        );
        
        const querySnapshot = await getDocs(usersQuery);
        const users = [];
        
        querySnapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return users;
        
    } catch (error) {
        console.error('Error searching users:', error);
        throw error;
    }
}

// Get user profile by ID
export async function getUserProfile(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return {
                id: userId,
                ...userDoc.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

export { handleSearch };
