import mongoose from 'mongoose';
import type { IPlaylist } from '../interfaces/index.js';

const playlistSchema = new mongoose.Schema<IPlaylist>({
  name:        { type: String, required: true, trim: true },
  ownerId:     { type: String, required: true },
  description: String,
  coverUrl:    String,
  tracks: [{
    id:        String,
    uri:       String,
    dateAdded: { type: Date, default: Date.now },
    meta:      mongoose.Schema.Types.Mixed
  }],
  createdAt: { type: Date, default: Date.now }
});

const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);
export default Playlist;
