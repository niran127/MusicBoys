import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
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
    meta: mongoose.Schema.Types.Mixed
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Playlist = mongoose.model('Playlist', playlistSchema);

export default Playlist;
