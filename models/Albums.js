const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
    coverArt: { type: String },
    genre: { type: String },
    releaseDate: { type: Date },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    totalStreams: { type: Number, default: 0 },
    description: { type: String }
});

module.exports = mongoose.model('Album', albumSchema);