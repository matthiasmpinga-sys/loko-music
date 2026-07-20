const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    avatar: { type: String },
    role: { type: String, default: 'listener', enum: ['listener', 'admin'] },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    listeningHistory: [{
        songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        playedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);