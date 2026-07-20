require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { OAuth2Client } = require('google-auth-library');

// Models
const User = require('./models/User');
const Song = require('./models/Song');
const Artist = require('./models/Artist');
const Album = require('./models/Album');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========== CONNECT TO MONGODB ==========
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB error:', err));

// ========== CONNECT TO CLOUDINARY ==========
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========== CLOUDINARY STORAGE ==========
const musicStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'loko/songs',
        resource_type: 'auto',
        allowed_formats: ['mp3', 'wav', 'm4a']
    }
});

const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'loko/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: musicStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

const uploadImage = multer({ 
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== GOOGLE AUTH ==========
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ========== JWT MIDDLEWARE ==========
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function isAdmin(req, res, next) {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: email === process.env.ADMIN_EMAIL ? 'admin' : 'listener'
        });

        await user.save();
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);
        
        res.json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check admin login first
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            let admin = await User.findOne({ email });
            if (!admin) {
                admin = new User({
                    name: 'Admin',
                    email: process.env.ADMIN_EMAIL,
                    role: 'admin',
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
                });
                await admin.save();
            }
            const token = jwt.sign({ userId: admin.id, role: 'admin' }, process.env.JWT_SECRET);
            return res.json({
                token,
                user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' }
            });
        }

        // Regular user login
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Google Login
app.post('/api/auth/google', async (req, res) => {
    try {
        const { tokenId } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                name,
                email,
                googleId: payload.sub,
                avatar: picture,
                role: email === process.env.ADMIN_EMAIL ? 'admin' : 'listener'
            });
            await user.save();
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
        });
    } catch (error) {
        res.status(500).json({ error: 'Google login failed' });
    }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ========== SONG ROUTES ==========

// Upload song (Admin only)
app.post('/api/songs', verifyToken, isAdmin, upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'artwork', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            title, artist, genre, releaseDate, album,
            coWriters, producers, featuredArtists,
            description, lyrics, isJointProject, isExplicit
        } = req.body;

        const musicFile = req.files['music'] ? req.files['music'][0] : null;
        const artworkFile = req.files['artwork'] ? req.files['artwork'][0] : null;

        if (!title || !artist || !musicFile || !genre) {
            return res.status(400).json({ error: 'Title, artist, genre, and music file are required' });
        }

        // Find or create artist
        let artistDoc = await Artist.findOne({ name: artist });
        if (!artistDoc) {
            artistDoc = new Artist({ name: artist, genre: [genre] });
            await artistDoc.save();
        }

        const song = new Song({
            title,
            artist,
            artistId: artistDoc._id,
            genre,
            releaseDate: releaseDate || new Date(),
            album: album || 'Single',
            coWriters: coWriters ? coWriters.split(',').map(s => s.trim()) : [],
            producers: producers ? producers.split(',').map(s => s.trim()) : [],
            featuredArtists: featuredArtists ? featuredArtists.split(',').map(s => s.trim()) : [],
            isJointProject: isJointProject === 'true',
            isExplicit: isExplicit === 'true',
            description: description || '',
            lyrics: lyrics || '',
            musicUrl: musicFile.path,
            artwork: artworkFile ? artworkFile.path : ''
        });

        await song.save();
        res.status(201).json(song);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload song' });
    }
});

// Get all songs
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find().sort({ uploadDate: -1 });
        res.json(songs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get songs' });
    }
});

// Get song by ID
app.get('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(song);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get song' });
    }
});

// Increment stream
app.post('/api/songs/:id/stream', async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $inc: { streams: 1, weeklyStreams: 1 } },
            { new: true }
        );
        res.json({ streams: song.streams });
    } catch (error) {
        res.status(500).json({ error: 'Failed to increment streams' });
    }
});

// Increment download
app.post('/api/songs/:id/download', async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloads: 1, weeklyDownloads: 1 } },
            { new: true }
        );
        res.json({ downloads: song.downloads });
    } catch (error) {
        res.status(500).json({ error: 'Failed to increment downloads' });
    }
});

// Like/unlike song
app.post('/api/songs/:id/like', verifyToken, async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1, weeklyLikes: 1 } },
            { new: true }
        );
        
        // Add to user favorites
        await User.findByIdAndUpdate(
            req.userId,
            { $addToSet: { favorites: song._id } }
        );
        
        res.json({ likes: song.likes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to like song' });
    }
});

// Unlike song
app.post('/api/songs/:id/unlike', verifyToken, async (req, res) => {
    try {
        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: -1 } },
            { new: true }
        );
        
        await User.findByIdAndUpdate(
            req.userId,
            { $pull: { favorites: song._id } }
        );
        
        res.json({ likes: song.likes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike song' });
    }
});

// ========== ARTIST ROUTES ==========

// Get all artists
app.get('/api/artists', async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get artists' });
    }
});

// Get artist by ID with their songs
app.get('/api/artists/:id', async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        const songs = await Song.find({ artistId: artist._id });
        const albums = await Album.find({ artistId: artist._id });
        res.json({ ...artist.toObject(), songs, albums });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get artist' });
    }
});

// ========== ALBUM ROUTES ==========

// Get all albums
app.get('/api/albums', async (req, res) => {
    try {
        const albums = await Album.find();
        res.json(albums);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get albums' });
    }
});

// ========== CHART ROUTES ==========

// Get weekly charts
app.get('/api/charts/weekly', async (req, res) => {
    try {
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
        const weekStr = thisWeek.toISOString().split('T')[0];

        // Top songs by streams
        const topStreams = await Song.find()
            .sort({ weeklyStreams: -1 })
            .limit(10)
            .select('title artist artwork weeklyStreams');

        // Top songs by downloads
        const topDownloads = await Song.find()
            .sort({ weeklyDownloads: -1 })
            .limit(10)
            .select('title artist artwork weeklyDownloads');

        // Top songs by likes
        const topLikes = await Song.find()
            .sort({ weeklyLikes: -1 })
            .limit(10)
            .select('title artist artwork weeklyLikes');

        res.json({
            week: weekStr,
            topStreams,
            topDownloads,
            topLikes
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get charts' });
    }
});

// ========== SEARCH ROUTE ==========

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        if (!query) {
            return res.json({ songs: [], artists: [] });
        }

        const songs = await Song.find({
            $text: { $search: query }
        }).limit(20);

        const artists = await Artist.find({
            name: { $regex: query, $options: 'i' }
        }).limit(10);

        res.json({ songs, artists });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// ========== SERVE FRONTEND ==========

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== START SERVER ==========

app.listen(PORT, () => {
    console.log(`🎵 LOKO Music Platform`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📧 Admin: ${process.env.ADMIN_EMAIL}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});