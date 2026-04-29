import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPlaylistTrack {
  id: string;
  uri: string;
  dateAdded: Date;
  meta: any;
}

export interface IPlaylist extends Document {
  name: string;
  ownerId: string; // Spotify ID or User ID depending on implementation
  description?: string;
  tracks: IPlaylistTrack[];
  createdAt: Date;
}

const playlistSchema = new Schema<IPlaylist>({
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

const Playlist: Model<IPlaylist> = mongoose.model<IPlaylist>('Playlist', playlistSchema);

export default Playlist;
