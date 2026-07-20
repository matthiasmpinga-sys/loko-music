// server.js - Simplest working version
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/test', (req, res) => {
    res.json({ status: 'success', message: '🎵 LOKO API is running on Vercel!' });
});

app.get('/api/songs', (req, res) => {
    const songs = [
        { _id: '1', title: 'Mabilinganya Empire', artist: 'Mady P', artwork: '/images/song1.jpg' },
        { _id: '2', title: 'Jehova', artist: 'Astroite', artwork: '/images/song2.jpg' },
        { _id: '3', title: 'London', artist: 'Xkesh & Charizma', artwork: '/images/song3.jpg' },
        { _id: '4', title: 'Miracle', artist: 'Vybez Kartel & Demarco', artwork: '/images/song4.jpg' }
    ];
    res.json(songs);
});

app.get('/api/artists', (req, res) => {
    const artists = [
        { _id: 'a1', name: 'Astroite', genre: 'Afro Pop', image: '/images/artist1.jpg' },
        { _id: 'a2', name: 'Saint Realest', genre: 'R&B', image: '/images/artist2.jpg' },
        { _id: 'a3', name: 'Vybez Kartel', genre: 'Dancehall', image: '/images/artist3.jpg' },
        { _id: 'a4', name: 'Xkesh', genre: 'Hip Hop', image: '/images/artist4.jpg' }
    ];
    res.json(artists);
});

app.get('/api/albums', (req, res) => {
    const albums = [
        { _id: 'al1', title: 'Great Beats', artist: 'Various', coverArt: '/images/album1.jpg' },
        { _id: 'al2', title: 'Afro Mix', artist: 'Various', coverArt: '/images/album2.jpg' },
        { _id: 'al3', title: 'Love Collection', artist: 'Various', coverArt: '/images/album3.jpg' }
    ];
    res.json(albums);
});

// Admin login (simple)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'matthiasmpinga@gmail.com' && password === '55everyxMM**') {
        res.json({
            token: 'admin_token_123',
            user: { id: 'admin', name: 'Admin', email: email, role: 'admin' }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Serve index.html for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel
module.exports = app;
// Add these to your server.js

// ========== FILE UPLOAD SETUP ==========
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['public/music', 'public/images'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'music') {
            cb(null, 'public/music/');
        } else if (file.fieldname === 'cover') {
            cb(null, 'public/images/');
        } else {
            cb(null, 'public/uploads/');
        }
    },
    filename: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// ========== ADMIN UPLOAD ROUTE ==========
app.post('/api/admin/upload', 
    upload.fields([
        { name: 'music', maxCount: 1 },
        { name: 'cover', maxCount: 1 }
    ]),
    (req, res) => {
        try {
            const { title, artist, genre, album, releaseDate, coWriters, producers, featuredArtists, description, lyrics } = req.body;
            const musicFile = req.files['music'] ? req.files['music'][0] : null;
            const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

            if (!title || !artist || !musicFile) {
                return res.status(400).json({ error: 'Title, artist, and music file are required' });
            }

            // Create song object
            const song = {
                _id: Date.now().toString(),
                title: title,
                artist: artist,
                genre: genre || 'Other',
                album: album || 'Single',
                releaseDate: releaseDate || new Date().toISOString().split('T')[0],
                coWriters: coWriters ? coWriters.split(',').map(s => s.trim()) : [],
                producers: producers ? producers.split(',').map(s => s.trim()) : [],
                featuredArtists: featuredArtists ? featuredArtists.split(',').map(s => s.trim()) : [],
                description: description || '',
                lyrics: lyrics || '',
                artwork: coverFile ? '/images/' + coverFile.filename : '/images/default-cover.jpg',
                musicUrl: '/music/' + musicFile.filename,
                uploadDate: new Date().toISOString()
            };

            // Add to songs array (you can also save to a file/database)
            songs.push(song);

            res.status(201).json({ 
                message: 'Song uploaded successfully!',
                song: song
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Failed to upload song' });
        }
    }
);

// Also update your songs endpoint to return the current songs list
app.get('/api/songs', (req, res) => {
    // If you have a database, fetch from there
    // For now, return the in-memory array
    res.json(songs);
});