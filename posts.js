// Posts module for Village Dangwar community app
import { auth, db, storage } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    getDocs, 
    doc, 
    getDoc,
    updateDoc,
    increment,
    serverTimestamp,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    showLoading, 
    hideLoading, 
    showError, 
    showSuccess, 
    clearMessages, 
    formatDate,
    validateImageFile,
    createImagePreview,
    generateUniqueFilename,
    sanitizeText
} from './utils.js';

// DOM elements
let postForm, feedContainer, postsError;
let postCaptionInput, postImageInput, imagePreview;

// Initialize posts module
export function initPosts() {
    postForm = document.getElementById('post-form');
    feedContainer = document.getElementById('feed-container');
    postsError = document.getElementById('posts-error');
    postCaptionInput = document.getElementById('post-caption');
    postImageInput = document.getElementById('post-image');
    imagePreview = document.getElementById('image-preview');

    setupEventListeners();
    loadPosts();
    
    console.log('Posts module initialized');
}

// Set up event listeners
function setupEventListeners() {
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmission);
    }
    
    if (postImageInput) {
        postImageInput.addEventListener('change', handleImagePreview);
    }
}

// Handle post submission
async function handlePostSubmission(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showError('posts-error', 'You must be logged in to create posts.');
        return;
    }
    
    const caption = postCaptionInput.value.trim();
    const imageFile = postImageInput.files[0];
    
    if (!validatePostInputs(caption, imageFile)) {
        return;
    }
    
    showLoading();
    clearMessages();
    
    try {
        const imageUrl = await uploadImage(imageFile, user.uid);
        const userProfile = await getUserProfile(user.uid);
        
        const postData = {
            caption: sanitizeText(caption),
            imageUrl: imageUrl,
            authorId: user.uid,
            authorUsername: userProfile.username || user.displayName || 'Anonymous',
            authorEmail: user.email,
            createdAt: serverTimestamp(),
            likes: [],
            likesCount: 0,
            comments: [],
            commentsCount: 0
        };
        
        await addDoc(collection(db, 'posts'), postData);
        
        await updateDoc(doc(db, 'users', user.uid), {
            postsCount: increment(1)
        });
        
        showSuccess('posts-error', 'Your post has been shared successfully!');
        postForm.reset();
        imagePreview.innerHTML = '';
        await loadPosts(true);
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Error creating post:', error);
        showError('posts-error', 'Failed to create post. Please try again.');
    }
}

// Handle image preview
function handleImagePreview(e) {
    const file = e.target.files[0];
    
    if (file) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            showError('posts-error', validation.error);
            postImageInput.value = '';
            imagePreview.innerHTML = '';
            return;
        }
        
        createImagePreview(file, 'image-preview');
        clearMessages();
    } else {
        imagePreview.innerHTML = '';
    }
}

// Validate post inputs
function validatePostInputs(caption, imageFile) {
    if (!caption) {
        showError('posts-error', 'Please write a caption for your post.');
        return false;
    }
    
    if (caption.length > 500) {
        showError('posts-error', 'Caption must be less than 500 characters.');
        return false;
    }
    
    if (!imageFile) {
        showError('posts-error', 'Please select an image to share.');
        return false;
    }
    
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
        showError('posts-error', validation.error);
        return false;
    }
    
    return true;
}

// Upload image to Firebase Storage
async function uploadImage(file, userId) {
    try {
        const filename = generateUniqueFilename(file.name);
        const storageRef = ref(storage, `posts/${userId}/${filename}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image. Please try again.');
    }
}

// Get user profile data
async function getUserProfile(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            return { username: 'Anonymous' };
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        return { username: 'Anonymous' };
    }
}

// Load posts from Firestore
export async function loadPosts(refresh = false) {
    try {
        if (refresh) {
            feedContainer.innerHTML = '<div class="loading">Loading posts...</div>';
        }
        
        const postsQuery = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        
        feedContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            feedContainer.innerHTML = '<div class="no-results">No posts yet. Be the first to share something!</div>';
            return;
        }
        
        querySnapshot.forEach((docSnap) => {
            const post = { id: docSnap.id, ...docSnap.data() };
            renderPost(post);
        });
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('posts-error', 'Failed to load posts. Please refresh the page.');
        feedContainer.innerHTML = '<div class="no-results">Failed to load posts. Please refresh the page.</div>';
    }
}

// Render a single post
function renderPost(post) {
    const postCard = document.createElement('div');
    postCard.classList.add('post-card');
    postCard.dataset.postId = post.id;
    
    let formattedDate = 'Just now';
    if (post.createdAt && post.createdAt.toDate) {
        formattedDate = formatDate(post.createdAt.toDate().toISOString());
    }
    
    postCard.innerHTML = `
        <img src="${post.imageUrl}" alt="Post image" loading="lazy" />
        <div class="post-content">
            <p class="post-caption">${post.caption}</p>
            <div class="post-meta">
                <span class="post-author">@${post.authorUsername}</span>
                <span class="post-date">${formattedDate}</span>
            </div>
            <div class="post-actions">
                <button class="like-btn" onclick="toggleLike('${post.id}')">
                    <span class="like-count">${post.likesCount || 0}</span> Likes
                </button>
            </div>
        </div>
    `;
    
    feedContainer.appendChild(postCard);
}

// Toggle like on a post
window.toggleLike = async function(postId) {
    const user = auth.currentUser;
    if (!user) {
        showError('posts-error', 'You must be logged in to like posts.');
        return;
    }
    
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (!postDoc.exists()) {
            showError('posts-error', 'Post not found.');
            return;
        }
        
        const postData = postDoc.data();
        const likes = postData.likes || [];
        const userLiked = likes.includes(user.uid);
        
        let updatedLikes;
        let likesCountChange;
        
        if (userLiked) {
            updatedLikes = likes.filter(uid => uid !== user.uid);
            likesCountChange = increment(-1);
        } else {
            updatedLikes = [...likes, user.uid];
            likesCountChange = increment(1);
        }
        
        await updateDoc(postRef, {
            likes: updatedLikes,
            likesCount: likesCountChange
        });
        
        // Update UI
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            const likeCount = postCard.querySelector('.like-count');
            if (likeCount) {
                const newCount = userLiked ? 
                    Math.max(0, parseInt(likeCount.textContent) - 1) : 
                    parseInt(likeCount.textContent) + 1;
                
                likeCount.textContent = newCount;
            }
        }
        
    } catch (error) {
        console.error('Error toggling like:', error);
        showError('posts-error', 'Failed to update like. Please try again.');
    }
};

export { handlePostSubmission, renderPost };
