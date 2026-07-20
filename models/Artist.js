const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    bio: { type: String },
    image: { type: String },
    genre: [{ type: String }],
    socialLinks: {
        instagram: String,
        twitter: String,
        youtube: String,
        spotify: String
    },
    joinDate: { type: Date, default: Date.now },
    totalStreams: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    monthlyListeners: { type: Number, default: 0 }
});

module.exports = mongoose.model('Artist', artistSchema);