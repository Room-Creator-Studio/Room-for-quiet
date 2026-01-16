        const storage = {
            get: (k) => {
                try {
                    const d = localStorage.getItem(k);
                    return d ? JSON.parse(d) : null;
                } catch {
                    return null;
                }
            },
            set: (k, v) => {
                try {
                    localStorage.setItem(k, JSON.stringify(v));
                } catch {
                    // fail silently for now
                }
            },
            remove: (k) => {
                try {
                    localStorage.removeItem(k);
                } catch {
                    // fail silently
                }
            },
            clear: () => {
                try {
                    localStorage.clear();
                } catch {
                    // fail silently
                }
            }
        };
    
        // Media handling
        let selectedMedia = [];
        const MAX_IMAGES = 4;
        const MAX_VIDEO = 1;
        // Reset everything function - only available for Creator account
        window.resetEverything = function() {
            const userProfile = storage.get('userProfile') || {};
            const accounts = storage.get('accounts') || {};
            const currentEmail = userProfile.email;
            const account = accounts[currentEmail];
            
            // Check if user is the Creator account
            const isCreator = account && (account.isCreator || currentEmail === 'harki.amrik@gmail.com');
            
            if (!isCreator) {
                alert('Only the Creator account can reset everything.');
                return;
            }
            
            if (confirm('Are you sure you want to reset everything? This will delete all rooms, messages, settings, and profile data (except the Creator account).')) {
                // Save Creator account before clearing
                const creatorAccount = accounts['harki.amrik@gmail.com'];
                
                // Clear all localStorage
                storage.clear();
                
                // Restore Creator account
                if (creatorAccount) {
                    storage.set('accounts', { 'harki.amrik@gmail.com': creatorAccount });
                }
                
                // Reset in-memory variables
                rooms = [];
                feedPosts = [];
                settings = {
                    theme: 'dark',
                    reduceAnimations: false,
                    quietMode: false,
                    onlyImportantUpdates: true,
                    appearInvisible: false,
                    hideActivityStatus: false
                };
                
                // Reload the page to start fresh
                alert('Everything has been reset. The page will reload.');
                window.location.reload();
            }
        };

        // Load rooms from localStorage only; start with none by default
        let rooms = storage.get('rooms');
        if (!Array.isArray(rooms)) {
            rooms = [];
        }

        // Load user profile and settings
        const userProfile = storage.get('userProfile') || {};
        const currentUser = storage.get('currentUser') || userProfile.name || "You";
        
        // Load settings with defaults
        let settings = storage.get('settings') || {
            theme: 'dark',
            reduceAnimations: false,
            quietMode: false,
            onlyImportantUpdates: true,
            appearInvisible: false,
            hideActivityStatus: false
        };

        // Load feed posts
        let feedPosts = storage.get('feedPosts') || [];

        let currentRoomId = null;

        function save() { 
            storage.set('rooms', rooms);
            storage.set('settings', settings);
            storage.set('feedPosts', feedPosts);
        }

        function init() {
            renderJoined();
            renderAvailable();
            loadSettings();
            checkCreatorAccess();
            document.getElementById('createRoomBtn').onclick = () => document.getElementById('createRoomPage').style.display = 'block';
            document.getElementById('profileBtn').onclick = openSettings;
            document.getElementById('feedBtn').onclick = openFeed;
            document.getElementById('createPostBtn').onclick = openCreatePost;
            document.getElementById('sendBtn').onclick = sendMessage;
            document.getElementById('messageInput').onkeypress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            };
            document.getElementById('postContent').oninput = (e) => {
            document.getElementById('postCharCount').textContent = e.target.value.length;
            };
            document.getElementById('mediaInput').onchange = handleMediaSelect;
            document.getElementById('createPostModal').onclick = (e) => {
                if (e.target.id === 'createPostModal') closeCreatePost();
            };
            document.getElementById('settingsOverlay').onclick = (e) => {
                if (e.target.id === 'settingsOverlay') closeSettings();
            };
            
            // Settings save button
            const saveSettingsBtn = document.querySelector('#settingsOverlay .btn-primary');
            if (saveSettingsBtn) {
                saveSettingsBtn.onclick = saveSettings;
            }
        }

        function checkCreatorAccess() {
            const userProfile = storage.get('userProfile') || {};
            const accounts = storage.get('accounts') || {};
            const currentEmail = userProfile.email;
            const account = accounts[currentEmail];
            const isCreator = account && (account.isCreator || currentEmail === 'harki.amrik@gmail.com');
            
            // Show reset section only for Creator
            const resetSection = document.getElementById('resetSection');
            if (resetSection) {
                resetSection.style.display = isCreator ? 'block' : 'none';
            }
        }

        function renderJoined() {
            const joined = rooms.filter(r => r.members && r.members.includes(currentUser));
            const el = document.getElementById('joinedRoomsContainer');
            const empty = document.getElementById('emptyState');
            
            if (!joined.length) {
                empty.style.display = 'block';
                el.innerHTML = '';
                return;
            }
            
            empty.style.display = 'none';
            el.innerHTML = joined.map(r => `
                <div class="room-card joined" onclick="openRoom(${r.id})">
                    <h3 class="room-name">${r.name}</h3>
                    <p class="room-description">${r.description}</p>
                    <div class="room-meta">
                        <div class="member-count">
                            <i class="fas fa-user-friends"></i>
                            <span>${r.members.length} friends</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function renderAvailable() {
            const available = rooms.filter(r => !r.members || !r.members.includes(currentUser));
            const container = document.getElementById('availableRoomsContainer');
            const empty = document.getElementById('availableEmptyState');

            if (!available.length) {
                container.innerHTML = '';
                if (empty) empty.style.display = 'block';
                return;
            }

            if (empty) empty.style.display = 'none';

            container.innerHTML = available.map(r => `
                <div class="room-card">
                    <h3 class="room-name">${r.name}</h3>
                    <p class="room-description">${r.description}</p>
                    <div class="room-meta">
                        <div class="member-count">
                            <i class="fas fa-user-friends"></i>
                            <span>${r.members ? r.members.length : 0} souls</span>
                        </div>
                        <button class="join-btn" onclick="joinRoom(event, ${r.id})">Join</button>
                    </div>
                </div>
            `).join('');
        }

        function openRoom(id) {
            currentRoomId = id;
            const room = rooms.find(r => r.id === id);
            document.getElementById('roomViewTitle').textContent = room.name;
            document.getElementById('roomCreator').textContent = `Created by ${room.creator}`;
            
            document.getElementById('membersList').innerHTML = room.members.map(m => {
                const init = m.split(' ').map(n => n[0]).join('');
                const isCreator = m === room.creator;
                return `
                    <div class="member-item">
                        <div class="member-avatar">${init}</div>
                        <div>
                            <div class="member-name">${m}${isCreator ? '<span class="creator-badge">Creator</span>' : ''}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            renderMessages(room);
            document.getElementById('roomViewPage').style.display = 'block';
        }

        function closeRoomView() {
            document.getElementById('roomViewPage').style.display = 'none';
            currentRoomId = null;
        }

        function renderMessages(room) {
            const el = document.getElementById('messagesContainer');
            if (!room.messages.length) {
                el.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><h3>No messages yet</h3></div>';
                return;
            }
            el.innerHTML = room.messages.map(m => {
                const init = m.author.split(' ').map(n => n[0]).join('');
                return `
                    <div class="message-group">
                        <div class="message-header">
                            <div class="message-avatar">${init}</div>
                            <span class="message-author">${m.author}</span>
                            <span class="message-time">${m.time}</span>
                        </div>
                        <div class="message-content">${m.content}</div>
                    </div>
                `;
            }).join('');
            el.scrollTop = el.scrollHeight;
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentRoomId) return;
            
            const room = rooms.find(r => r.id === currentRoomId);
            const message = { 
                author: currentUser, 
                content: text, 
                time: 'Just now',
                timestamp: Date.now()
            };
            room.messages.push(message);
            
            // Also add to feed posts if user wants to track their thoughts
            feedPosts.unshift({
                roomName: room.name,
                content: text,
                timestamp: Date.now(),
                roomId: currentRoomId
            });
            
            save();
            renderMessages(room);
            input.value = '';
        }

        function joinRoom(evt, id) {
            evt.stopPropagation();
            const room = rooms.find(r => r.id === id);
            if (!room) return;
            
            // Initialize members array if it doesn't exist
            if (!room.members) {
                room.members = [];
            }
            
            // Only add user if not already a member
            if (!room.members.includes(currentUser)) {
                room.members.push(currentUser);
                save();
                renderJoined();
                renderAvailable();
            }
        }

        function createNewRoom() {
            const name = document.getElementById('newRoomName').value.trim();
            const desc = document.getElementById('newRoomDescription').value.trim();
            const limit = parseInt(document.getElementById('newRoomLimit').value) || 8;
            
            if (!name || !desc) { alert('Please fill all fields'); return; }
            
            rooms.push({
                id: Date.now(),
                name, 
                description: desc,
                members: [currentUser],
                limit: Math.max(2, Math.min(12, limit)),
                creator: currentUser,
                messages: []
            });
            
            save();
            closeCreateRoom();
            renderJoined();
            renderAvailable();
        }

        function closeCreateRoom() {
            document.getElementById('createRoomPage').style.display = 'none';
            document.getElementById('newRoomName').value = '';
            document.getElementById('newRoomDescription').value = '';
            document.getElementById('newRoomLimit').value = '8';
        }

        function loadSettings() {
            // Load and apply theme
            if (settings.theme === 'light') {
                document.querySelector('#settingsOverlay input[name="theme"][value="light"]')?.setAttribute('checked', 'checked');
            } else {
                document.querySelector('#settingsOverlay input[name="theme"][value="dark"]')?.setAttribute('checked', 'checked');
            }
            
            // Load checkboxes
            const checkboxes = {
                'reduceAnimations': settings.reduceAnimations,
                'quietMode': settings.quietMode,
                'onlyImportantUpdates': settings.onlyImportantUpdates,
                'appearInvisible': settings.appearInvisible,
                'hideActivityStatus': settings.hideActivityStatus
            };
            
            // Apply settings to checkboxes (we'll handle this in saveSettings)
        }

        window.saveSettings = function() {
            // Get theme
            const themeRadio = document.querySelector('#settingsOverlay input[name="theme"]:checked');
            if (themeRadio) {
                settings.theme = themeRadio.value || 'dark';
            }
            
            // Get all checkboxes in settings modal
            const settingsModal = document.getElementById('settingsOverlay');
            const checkboxes = settingsModal.querySelectorAll('input[type="checkbox"]');
            
            // Map checkboxes to settings (by their position/label text)
            const checkboxLabels = Array.from(settingsModal.querySelectorAll('label')).map(l => l.textContent.trim());
            
            checkboxes.forEach((cb, index) => {
                const label = checkboxLabels[index];
                if (label.includes('Reduce animations') || label.includes('Reduce animations')) {
                    settings.reduceAnimations = cb.checked;
                } else if (label.includes('Quiet mode')) {
                    settings.quietMode = cb.checked;
                } else if (label.includes('Only important updates')) {
                    settings.onlyImportantUpdates = cb.checked;
                } else if (label.includes('Appear invisible')) {
                    settings.appearInvisible = cb.checked;
                } else if (label.includes('Hide activity status')) {
                    settings.hideActivityStatus = cb.checked;
                }
            });
            
            storage.set('settings', settings);
            closeSettings();
            alert('Settings saved quietly');
        };

        function openSettings() {
            loadSettings(); // Reload settings when opening
            document.getElementById('settingsOverlay').style.display = 'flex';
        }

        function closeSettings() {
            document.getElementById('settingsOverlay').style.display = 'none';
        }

        function openFeed() {
            renderFeed();
            document.getElementById('feedPage').style.display = 'block';
        }

        function closeFeed() {
            document.getElementById('feedPage').style.display = 'none';
        }

        function formatTimeAgo(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
            return new Date(timestamp).toLocaleDateString();
        }

function renderFeed() {
    // Get user's messages from all rooms they're in
    const userMessages = [];
    rooms.forEach(room => {
        if (room.members && room.members.includes(currentUser)) {
            room.messages.forEach(msg => {
                if (msg.author === currentUser) {
                    userMessages.push({
                        roomName: room.name,
                        content: msg.content,
                        timestamp: msg.timestamp || Date.now(),
                        roomId: room.id,
                        media: msg.media || []
                    });
                }
            });
        }
    });
    
    // Also include feed posts
    const allPosts = [...feedPosts, ...userMessages]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 50); // Limit to 50 most recent

    if (allPosts.length === 0) {
        document.getElementById('feedContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-feather-alt"></i>
                <h3>No thoughts shared yet</h3>
                <p>Your quiet moments will appear here</p>
            </div>
        `;
        return;
    }

    document.getElementById('feedContent').innerHTML = allPosts.map(post => {
        let mediaClass = '';
        if (post.media && post.media.length > 0) {
            if (post.media.length === 1) mediaClass = 'single';
            else if (post.media.length === 2) mediaClass = 'double';
            else if (post.media.length === 3) mediaClass = 'triple';
            else mediaClass = 'quad';
        }

        return `
            <div class="post-card">
                <span class="post-room-tag">from ${post.roomName}</span>
                <div class="post-content">${post.content}</div>
                ${post.media && post.media.length > 0 ? `
                    <div class="post-media ${mediaClass}">
                        ${post.media.map(media => {
                            if (media.type === 'video') {
                                return `<video controls src="${media.data}" class="post-video"></video>`;
                            } else {
                                return `<img src="${media.data}" alt="Posted image" class="post-image">`;
                            }
                        }).join('')}
                    </div>
                ` : ''}
                <div class="post-meta">
                    <span>${formatTimeAgo(post.timestamp)}</span>
                </div>
            </div>
        `;
    }).join('');
}
        init();
        function openCreatePost() {
    const modal = document.getElementById('createPostModal');
    modal.style.display = 'flex';
    
    // Populate room select with joined rooms
    const roomSelect = document.getElementById('postRoomSelect');
    const joinedRooms = rooms.filter(r => r.members && r.members.includes(currentUser));
    
    roomSelect.innerHTML = '<option value="">Personal thought (visible to all)</option>';
    joinedRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });
    
    // Reset form
    document.getElementById('postContent').value = '';
    document.getElementById('postCharCount').textContent = '0';
    selectedMedia = [];
    updateMediaPreview();
}

function closeCreatePost() {
    document.getElementById('createPostModal').style.display = 'none';
    selectedMedia = [];
    updateMediaPreview();
}

function handleMediaSelect(event) {
    const files = Array.from(event.target.files);
    
    // Check for video
    const hasVideo = files.some(f => f.type.startsWith('video/'));
    const existingVideo = selectedMedia.some(m => m.type === 'video');
    
    if (hasVideo && (existingVideo || selectedMedia.length > 0)) {
        alert('You can only upload one video, or multiple images (not both)');
        return;
    }
    
    if (existingVideo && files.length > 0) {
        alert('You can only upload one video at a time');
        return;
    }
    
    files.forEach(file => {
        if (file.type.startsWith('video/')) {
            // Only one video allowed
            if (selectedMedia.length === 0) {
                processMediaFile(file);
            }
        } else if (file.type.startsWith('image/')) {
            // Up to 4 images
            const currentImages = selectedMedia.filter(m => m.type === 'image').length;
            if (currentImages < MAX_IMAGES && selectedMedia.length < MAX_IMAGES) {
                processMediaFile(file);
            } else {
                alert(`You can only upload up to ${MAX_IMAGES} images`);
            }
        }
    });
    
    // Clear input
    event.target.value = '';
}

function processMediaFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const mediaObj = {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            data: e.target.result,
            name: file.name
        };
        
        selectedMedia.push(mediaObj);
        updateMediaPreview();
    };
    
    reader.readAsDataURL(file);
}

function updateMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    
    if (selectedMedia.length === 0) {
        preview.innerHTML = '';
        preview.style.display = 'none';
        return;
    }
    
    preview.style.display = 'grid';
    preview.innerHTML = selectedMedia.map((media, index) => `
        <div class="media-preview-item">
            ${media.type === 'video' 
                ? `<video src="${media.data}" class="preview-video"></video>`
                : `<img src="${media.data}" alt="Preview" class="preview-image">`
            }
            <button class="remove-media-btn" onclick="removeMedia(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeMedia(index) {
    selectedMedia.splice(index, 1);
    updateMediaPreview();
}

function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const roomId = document.getElementById('postRoomSelect').value;
    
    if (!content && selectedMedia.length === 0) {
        alert('Please share a thought or add some media');
        return;
    }
    
    if (roomId) {
        // Post to specific room
        const room = rooms.find(r => r.id == roomId);
        if (room) {
            const message = {
                author: currentUser,
                content: content,
                time: 'Just now',
                timestamp: Date.now(),
                media: [...selectedMedia]
            };
            room.messages.push(message);
        }
    } else {
        // Post as personal thought (add to feedPosts)
        feedPosts.unshift({
            roomName: 'Personal',
            content: content,
            timestamp: Date.now(),
            media: [...selectedMedia]
        });
    }
    
    save();
    closeCreatePost();
    alert('Your thought has been shared quietly');
}