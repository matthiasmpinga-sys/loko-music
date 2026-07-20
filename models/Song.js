const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
    coWriters: [{ type: String }],
    producers: [{ type: String }],
    featuredArtists: [{ type: String }],
    genre: { type: String, required: true },
    releaseDate: { type: Date, default: Date.now },
    album: { type: String },
    albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    artwork: { type: String },
    musicUrl: { type: String, required: true },
    duration: { type: String },
    description: { type: String },
    lyrics: { type: String },
    isJointProject: { type: Boolean, default: false },
    isExplicit: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now },
    
    // Stats
    streams: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    
    // Weekly charts
    weeklyStreams: { type: Number, default: 0 },
    weeklyDownloads: { type: Number, default: 0 },
    weeklyLikes: { type: Number, default: 0 },
    chartPosition: { type: Number },
    chartWeek: { type: String } // e.g., "2024-01-15"
});

// Index for faster searches
songSchema.index({ title: 'text', artist: 'text', genre: 'text' });

module.exports = mongoose.model('Song', songSchema);