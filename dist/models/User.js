import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    spotifyId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple users to have no spotifyId yet
    },
    displayName: String,
    currentMood: {
        type: String,
        default: "Focus"
    },
    likedTracks: [{
            id: String,
            uri: String,
            popularity: Number,
            dateAdded: { type: Date, default: Date.now },
            label: String,
            meta: Schema.Types.Mixed
        }],
    followedArtists: [{
            id: String,
            name: String,
            image: String,
            uri: String
        }],
    lastPlayedTrack: {
        uri: String,
        meta: {
            name: String,
            artist: String,
            artistUri: String,
            image: String
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const User = mongoose.model('User', userSchema);
export default User;
