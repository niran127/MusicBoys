import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILikedTrack {
  id: string;
  uri: string;
  popularity?: number;
  dateAdded: Date;
  label?: string;
  meta: any;
}

export interface IFollowedArtist {
  id: string;
  name: string;
  image: string;
  uri: string;
}

export interface IUser extends Document {
  username: string;
  password: string;
  spotifyId?: string;
  displayName?: string;
  currentMood: string;
  likedTracks: ILikedTrack[];
  followedArtists: IFollowedArtist[];
  lastPlayedTrack?: {
    uri: string;
    meta: {
      name: string;
      artist: string;
      artistUri: string;
      image: string;
    };
  };
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
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

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
