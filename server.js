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