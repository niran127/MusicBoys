import mongoose, { Schema } from 'mongoose';
const playlistSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: String, // Spotify ID
        required: true
    },
    description: String,
    tracks: [{
            id: String,
            uri: String,
            dateAdded: { type: Date, default: Date.now },
            meta: Schema.Types.Mixed
        }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Playlist = mongoose.model('Playlist', playlistSchema);
export default Playlist;
