export interface TrackMeta {
  name: string;
  artist: string;
  artistUri: string | null;
  image: string | null;
}

export interface LikedTrack {
  id: string;
  uri: string;
  popularity?: number;
  dateAdded?: Date;
  label?: string;
  meta?: TrackMeta;
}

export interface PlaylistTrack {
  id: string;
  uri: string;
  dateAdded?: Date;
  meta?: TrackMeta;
}

export interface FollowedArtist {
  id: string;
  name: string;
  image?: string;
  uri?: string;
}

export interface LastPlayedTrack {
  uri: string;
  meta: TrackMeta;
}

export interface IUser {
  _id?: string;
  username: string;
  password: string;
  spotifyId?: string;
  displayName?: string;
  currentMood?: string;
  likedTracks: LikedTrack[];
  followedArtists: FollowedArtist[];
  lastPlayedTrack?: LastPlayedTrack;
  profileImageUrl?: string;
  preferredTheme?: string;
  createdAt?: Date;
}

export interface IPlaylist {
  _id?: string;
  name: string;
  ownerId: string;
  description?: string;
  coverUrl?: string;
  tracks: PlaylistTrack[];
  createdAt?: Date;
}

// Request body types
export interface LoginBody {
  username: string;
  password: string;
  remember?: string;
}

export interface RegisterBody {
  username: string;
  password: string;
}

export interface SpotifyLoginBody {
  spotifyId: string;
  displayName?: string;
}

export interface SyncBody {
  id: string;
  name?: string;
}

export interface MoodBody {
  mood: string;
}

export interface ThemeBody {
  theme: string;
}

export interface LastPlayedBody {
  uri: string;
  meta: TrackMeta;
}

export interface CreatePlaylistBody {
  name: string;
  description?: string;
  tracks?: Partial<PlaylistTrack>[];
}

export interface AddTrackBody {
  track?: Partial<PlaylistTrack>;
  tracks?: Partial<PlaylistTrack>[];
}

export interface UpdateTitleBody {
  name: string;
}
