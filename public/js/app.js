// ========== API CONFIGURATION ==========
const API_URL = '';
let currentUser = null;
let currentSongIndex = 0;
let playlist = [];
let isPlaying = false;
let currentSongId = null;

// ========== DOM ELEMENTS ==========
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const playerCover = document.getElementById('playerCover');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');
const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');

// ========== AUTH FUNCTIONS ==========

function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
    renderGoogleButton();
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUI();
            closeModal('loginModal');
            loadData();
            showToast('Welcome back, ' + currentUser.name + '! 🎵');
        } else {
            showToast(data.error || 'Login failed');
        }
    } catch (error) {
        showToast('Error connecting to server');
    }
}

async function register(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUI();
            closeModal('registerModal');
            loadData();
            showToast('Welcome to LOKO, ' + currentUser.name + '! 🎵');
        } else {
            showToast(data.error || 'Registration failed');
        }
    } catch (error) {
        showToast('Error connecting to server');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateUI();
    showToast('Logged out');
}

function updateUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('userName').textContent = '👤 ' + currentUser.name;
        
        // Show admin upload button if admin
        if (currentUser.role === 'admin') {
            showAdminUpload();
        }
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

function renderGoogleButton() {
    document.getElementById('googleLogin').innerHTML = '';
    // Google login button will be rendered here
}

// ========== TOAST NOTIFICATION ==========

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== LOAD DATA ==========

async function loadData() {
    try {
        // Load songs
        const songsRes = await fetch('/api/songs');
        const songs = await songsRes.json();
        playlist = songs;
        renderNewReleases(songs.slice(0, 8));
        renderCharts();

        // Load artists
        const artistsRes = await fetch('/api/artists');
        const artists = await artistsRes.json();
        renderArtists(artists.slice(0, 6));
        renderAllArtists(artists);

        // Load albums
        const albumsRes = await fetch('/api/albums');
        const albums = await albumsRes.json();
        renderAlbums(albums);

        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            const meRes = await fetch('/api/auth/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (meRes.ok) {
                currentUser = await meRes.json();
                updateUI();
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ========== RENDER FUNCTIONS ==========

function renderNewReleases(songs) {
    const container = document.getElementById('newReleases');
    container.innerHTML = songs.map((song, index) => `
        <div class="song-card" onclick="playSong(${index})">
            <img src="${song.artwork || 'images/default-cover.jpg'}" alt="${song.title}">
            <div class="play-overlay"><i class="fas fa-play"></i></div>
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
            <div class="song-actions">
                <button onclick="event.stopPropagation(); toggleLike('${song.id}')">
                    <i class="far fa-heart"></i>
                </button>
                <button onclick="event.stopPropagation(); downloadSongById('${song.id}')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderArtists(artists) {
    const container = document.getElementById('featuredArtists');
    container.innerHTML = artists.map(artist => `
        <div class="artist-card" onclick="viewArtist('${artist._id}')">
            <img src="${artist.image || 'images/default-artist.jpg'}" alt="${artist.name}">
            <h4>${artist.name}</h4>
            <p>${artist.genre ? artist.genre.join(', ') : ''}</p>
        </div>
    `).join('');
}

function renderAllArtists(artists) {
    const container = document.getElementById('artistsContainer');
    container.innerHTML = artists.map(artist => `
        <div class="artist-card" onclick="viewArtist('${artist._id}')">
            <img src="${artist.image || 'images/default-artist.jpg'}" alt="${artist.name}">
            <h4>${artist.name}</h4>
            <p>${artist.genre ? artist.genre.join(', ') : ''}</p>
        </div>
    `).join('');
}

function renderAlbums(albums) {
    const container = document.getElementById('albumsContainer');
    container.innerHTML = albums.map(album => `
        <div class="album-card" onclick="viewAlbum('${album._id}')">
            <img src="${album.coverArt || 'images/default-cover.jpg'}" alt="${album.title}">
            <h4>${album.title}</h4>
            <p>${album.artist}</p>
        </div>
    `).join('');
}

// ========== PLAYER CONTROLS ==========

function playSong(index) {
    if (index < 0 || index >= playlist.length) return;
    currentSongIndex = index;
    const song = playlist[currentSongIndex];
    currentSongId = song._id;

    audio.src = song.musicUrl;
    playerTitle.textContent = song.title;
    playerArtist.textContent = song.artist;
    playerCover.src = song.artwork || 'images/default-cover.jpg';

    audio.play()
        .then(() => {
            isPlaying = true;
            updatePlayButton();
            // Increment stream count
            fetch(`/api/songs/${song._id}/stream`, { method: 'POST' });
        })
        .catch(err => console.log('Play error:', err));
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        if (!audio.src) {
            playSong(0);
            return;
        }
        audio.play()
            .then(() => {
                isPlaying = true;
                updatePlayButton();
            })
            .catch(err => console.log('Play error:', err));
    }
    updatePlayButton();
}

function updatePlayButton() {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
}

function nextSong() {
    const nextIndex = (currentSongIndex + 1) % playlist.length;
    playSong(nextIndex);
}

function prevSong() {
    const prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    playSong(prevIndex);
}

// ========== AUDIO EVENTS ==========

audio.addEventListener('timeupdate', function() {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        currentTime.textContent = formatTime(audio.currentTime);
    }
});

audio.addEventListener('loadedmetadata', function() {
    totalTime.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', function() {
    nextSong();
});

function seekProgress(e) {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

volumeSlider.addEventListener('input', function() {
    audio.volume = this.value / 100;
});

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// ========== DOWNLOAD ==========

function downloadSong() {
    if (currentSongId) {
        downloadSongById(currentSongId);
    }
}

async function downloadSongById(songId) {
    try {
        const song = playlist.find(s => s._id === songId);
        if (!song) return;

        // Increment download count
        await fetch(`/api/songs/${songId}/download`, { method: 'POST' });

        // Create download with metadata
        const link = document.createElement('a');
        link.href = song.musicUrl;
        
        // Create filename with metadata
        const filename = `${song.title} - ${song.artist}`;
        link.download = `${filename}.mp3`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Downloading: ${song.title} 🎵`);
    } catch (error) {
        showToast('Download failed');
    }
}

// ========== LIKE ==========

async function toggleLike(songId) {
    if (!currentUser) {
        showToast('Please login to like songs');
        showLogin();
        return;
    }

    const song = playlist.find(s => s._id === songId);
    if (!song) return;

    try {
        const isLiked = song.likes > 0; // Simplified check
        const endpoint = isLiked ? 'unlike' : 'like';
        
        const response = await fetch(`/api/songs/${songId}/${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });

        if (response.ok) {
            const data = await response.json();
            song.likes = data.likes;
            showToast(isLiked ? 'Removed like 💔' : 'Liked ❤️');
            loadData(); // Refresh data
        }
    } catch (error) {
        showToast('Error toggling like');
    }
}

// ========== CHARTS ==========

async function renderCharts() {
    try {
        const response = await fetch('/api/charts/weekly');
        const charts = await response.json();
        const container = document.getElementById('chartsContainer');
        
        if (charts.topStreams) {
            container.innerHTML = charts.topStreams.map((song, index) => `
                <div class="chart-item" onclick="playSong(playlist.findIndex(s => s._id === song._id))">
                    <span class="chart-rank">#${index + 1}</span>
                    <img src="${song.artwork || 'images/default-cover.jpg'}" alt="${song.title}">
                    <div class="chart-info">
                        <h4>${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                    <span class="chart-stats">🎧 ${song.weeklyStreams}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

async function loadChart(type) {
    try {
        const response = await fetch('/api/charts/weekly');
        const charts = await response.json();
        const container = document.getElementById('chartContent');
        
        let data = [];
        let label = '';
        if (type === 'streams') { data = charts.topStreams; label = '🎧 Streams'; }
        else if (type === 'downloads') { data = charts.topDownloads; label = '⬇️ Downloads'; }
        else if (type === 'likes') { data = charts.topLikes; label = '❤️ Likes'; }

        container.innerHTML = data.map((song, index) => `
            <div class="chart-item" onclick="playSong(playlist.findIndex(s => s._id === song._id))">
                <span class="chart-rank">#${index + 1}</span>
                <img src="${song.artwork || 'images/default-cover.jpg'}" alt="${song.title}">
                <div class="chart-info">
                    <h4>${song.title}</h4>
                    <p>${song.artist}</p>
                </div>
                <span class="chart-stats">${label} ${song.weeklyStreams || song.weeklyDownloads || song.weeklyLikes || 0}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

// ========== PAGE NAVIGATION ==========

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    if (page === 'home') {
        document.getElementById('homePage').style.display = 'block';
    } else if (page === 'charts') {
        document.getElementById('chartsPage').style.display = 'block';
        loadChart('streams');
    } else if (page === 'artists') {
        document.getElementById('artistsPage').style.display = 'block';
    } else if (page === 'albums') {
        document.getElementById('albumsPage').style.display = 'block';
    } else if (page === 'artist-detail') {
        document.getElementById('artistDetailPage').style.display = 'block';
    }
}

async function viewArtist(artistId) {
    try {
        const response = await fetch(`/api/artists/${artistId}`);
        const data = await response.json();
        
        showPage('artist-detail');
        const container = document.getElementById('artistDetail');
        container.innerHTML = `
            <div class="artist-header">
                <img src="${data.image || 'images/default-artist.jpg'}" alt="${data.name}">
                <div>
                    <h1>${data.name}</h1>
                    <p>${data.genre ? data.genre.join(', ') : ''}</p>
                    <p>${data.bio || ''}</p>
                    <div class="artist-stats">
                        <span>🎵 ${data.totalStreams || 0} streams</span>
                        <span>⬇️ ${data.totalDownloads || 0} downloads</span>
                        <span>🎧 ${data.monthlyListeners || 0} monthly listeners</span>
                    </div>
                </div>
            </div>
            <h3>Songs</h3>
            <div class="song-grid">
                ${data.songs.map(song => `
                    <div class="song-card" onclick="playSong(playlist.findIndex(s => s._id === '${song._id}'))">
                        <img src="${song.artwork || 'images/default-cover.jpg'}">
                        <h4>${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                `).join('')}
            </div>
            <h3>Albums</h3>
            <div class="album-grid">
                ${data.albums.map(album => `
                    <div class="album-card">
                        <img src="${album.coverArt || 'images/default-cover.jpg'}">
                        <h4>${album.title}</h4>
                        <p>${album.artist}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        showToast('Error loading artist');
    }
}

// ========== SEARCH ==========

async function searchContent(event) {
    const query = event.target.value;
    if (query.length < 2) return;

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        // Update search results display
        if (results.songs.length > 0 || results.artists.length > 0) {
            // Show search results
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

// ========== ADMIN UPLOAD ==========

function showAdminUpload() {
    // Add upload button to admin view
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-primary';
    uploadBtn.innerHTML = '📤 Upload Song';
    uploadBtn.onclick = showUploadModal;
    document.querySelector('.nav-right').appendChild(uploadBtn);
}

function showUploadModal() {
    // Show upload form modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'uploadModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;max-height:80vh;overflow-y:auto;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>📤 Upload New Song</h2>
            <form onsubmit="uploadSong(event)">
                <input type="text" id="songTitle" placeholder="Song Title" required>
                <input type="text" id="songArtist" placeholder="Artist Name" required>
                <input type="text" id="songGenre" placeholder="Genre" required>
                <input type="text" id="songCoWriters" placeholder="Co-writers (comma separated)">
                <input type="text" id="songProducers" placeholder="Producers (comma separated)">
                <input type="text" id="songFeatured" placeholder="Featured Artists (comma separated)">
                <input type="date" id="songReleaseDate">
                <input type="text" id="songAlbum" placeholder="Album Name">
                <textarea id="songDescription" placeholder="Description"></textarea>
                <textarea id="songLyrics" placeholder="Lyrics"></textarea>
                <label style="display:block;color:#888;font-size:14px;margin:10px 0 5px;">
                    <input type="checkbox" id="songJointProject"> Joint Project
                </label>
                <label style="display:block;color:#888;font-size:14px;margin:10px 0 5px;">
                    <input type="checkbox" id="songExplicit"> Explicit Content
                </label>
                <label style="display:block;color:#00ff88;font-weight:bold;margin:10px 0 5px;">
                    🎵 MP3 File *
                </label>
                <input type="file" id="musicUpload" accept="audio/mpeg,audio/mp3" required>
                <label style="display:block;color:#00ff88;font-weight:bold;margin:10px 0 5px;">
                    🖼️ Artwork Image
                </label>
                <input type="file" id="artworkUpload" accept="image/*">
                <div id="uploadProgress" style="display:none;margin:10px 0;">
                    <div style="height:6px;background:#333;border-radius:3px;overflow:hidden;">
                        <div id="uploadProgressBar" style="width:0%;height:100%;background:#00ff88;transition:width 0.3s;"></div>
                    </div>
                    <p id="uploadStatus" style="color:#888;font-size:14px;margin-top:5px;">Uploading...</p>
                </div>
                <button type="submit" class="btn-primary" style="width:100%;margin-top:10px;">Upload Song</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

async function uploadSong(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('songTitle').value);
    formData.append('artist', document.getElementById('songArtist').value);
    formData.append('genre', document.getElementById('songGenre').value);
    formData.append('coWriters', document.getElementById('songCoWriters').value);
    formData.append('producers', document.getElementById('songProducers').value);
    formData.append('featuredArtists', document.getElementById('songFeatured').value);
    formData.append('releaseDate', document.getElementById('songReleaseDate').value);
    formData.append('album', document.getElementById('songAlbum').value);
    formData.append('description', document.getElementById('songDescription').value);
    formData.append('lyrics', document.getElementById('songLyrics').value);
    formData.append('isJointProject', document.getElementById('songJointProject').checked);
    formData.append('isExplicit', document.getElementById('songExplicit').checked);
    
    const musicFile = document.getElementById('musicUpload').files[0];
    const artworkFile = document.getElementById('artworkUpload').files[0];
    
    if (!musicFile) {
        showToast('Please select an MP3 file');
        return;
    }
    
    formData.append('music', musicFile);
    if (artworkFile) {
        formData.append('artwork', artworkFile);
    }

    // Show progress
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const statusText = document.getElementById('uploadStatus');
    progressDiv.style.display = 'block';

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/songs', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                statusText.textContent = `Uploading... ${percent}%`;
            }
        };

        xhr.onload = function() {
            if (xhr.status === 201) {
                showToast('✅ Song uploaded successfully!');
                document.getElementById('uploadModal').remove();
                loadData();
            } else {
                const error = JSON.parse(xhr.responseText);
                showToast('❌ ' + (error.error || 'Upload failed'));
            }
        };

        xhr.onerror = function() {
            showToast('❌ Network error');
        };

        xhr.send(formData);
    } catch (error) {
        showToast('Error uploading song');
    }
}

// ========== KEYBOARD SHORTCUTS ==========

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    }
    if (e.code === 'ArrowRight') {
        e.preventDefault();
        audio.currentTime += 5;
    }
    if (e.code === 'ArrowLeft') {
        e.preventDefault();
        audio.currentTime -= 5;
    }
});

// ========== INIT ==========

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Add toast styles
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.9);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        border: 1px solid #00ff88;
        animation: fadeInUp 0.3s ease;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(style);