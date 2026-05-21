import mongoose from 'mongoose';
import type { IUser } from '../interfaces/index.js';

const userSchema = new mongoose.Schema<IUser>({
  username:         { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  spotifyId:        { type: String, unique: true, sparse: true },
  displayName:      String,
  currentMood:      { type: String, default: 'Focus' },
  likedTracks: [{
    id:         String,
    uri:        String,
    popularity: Number,
    dateAdded:  { type: Date, default: Date.now },
    label:      String,
    meta:       mongoose.Schema.Types.Mixed
  }],
  followedArtists: [{
    id:    String,
    name:  String,
    image: String,
    uri:   String
  }],
  lastPlayedTrack: {
    uri:  String,
    meta: {
      name:      String,
      artist:    String,
      artistUri: String,
      image:     String
    }
  },
  profileImageUrl: String,
  preferredTheme:  { type: String, default: 'dark' },
  createdAt:       { type: Date, default: Date.now }
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
