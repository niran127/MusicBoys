export interface TrackMeta {
    id?: string;
    name: string;
    artist: string;
    artistUri?: string;
    image: string;
    popularity?: number;
    album?: string;
}

export interface LikedTrack {
    uri: string;
    meta: TrackMeta;
    id: string;
    dateAdded?: Date;
    label?: string;
    popularity?: number;
}

export interface PlaylistTrack {
    id: string;
    uri: string;
    meta: TrackMeta;
    dateAdded?: Date;
}

export interface Playlist {
    _id: string;
    name: string;
    description?: string;
    tracks: PlaylistTrack[];
    ownerId: string;
    createdAt?: Date;
}

export interface ArtistData {
    id: string;
    name: string;
    image: string;
    uri: string;
}

export type PageType = "home" | "zoeken" | "likes" | "playlist" | "detail" | "game";

declare global {
    interface Window {
        showPage: (page: string, playlistName?: string | null) => void;
        showDetailPage: (uri: string, type: string) => Promise<void>;
        showArtistDetail: (id: string) => Promise<void>;
        showTrackDetail: (id: string) => Promise<void>;
        syncGlobalLikeUI: (uri: string, isLiked: boolean) => void;
        updateLikesPage: () => void;
        setLikes: (likes: LikedTrack[]) => void;
        getStoredCurrentTrack: () => any;
        setStoredCurrentTrack: (data: any) => void;
        showPlaylistMenu: (e: MouseEvent, data: any) => void;
        showPlaylist: (name: string) => void;
        showToast: (message: string) => void;
        toggleGlobalLike: (uri: string, meta: TrackMeta) => Promise<boolean>;
        toggleGlobalFollow: (artistId: string, artistData: ArtistData) => Promise<boolean>;
        createBackendPlaylist: (name: string) => Promise<boolean>;
        addTrackToBackendPlaylist: (playlistId: string, track: any) => Promise<void>;
        removeTrackFromBackendPlaylist: (playlistId: string, trackId: string) => Promise<void>;
        deleteBackendPlaylist: (playlistId: string) => Promise<void>;
        getStoredPlaylists: () => Playlist[];
        renderCustomPlaylists: () => void;
        generateMoodPlaylist: () => Promise<void>;
        updateHeaderMood: (mood: string) => void;
        _initSpotifyPlayer: () => void;
        _spSDKFired: boolean;
        playbackQueue: any[];
        currentQueueIndex: number;
        getTrackId: (uri: string) => string;
        spotifySearch: (query: string, type: string) => Promise<any>;
        spotifyGetArtist: (id: string) => Promise<any>;
        spotifyGetArtistTopTracks: (id: string) => Promise<any>;
        spotifyGetArtistAlbums: (id: string) => Promise<any>;
        spotifyGetTrack: (id: string) => Promise<any>;
        spotifyGetMe: () => Promise<any>;
        handleSearch: () => Promise<void>;
        initGame: () => Promise<void>;
        playSong: (uris: string | string[], meta: TrackMeta, isNavAction?: boolean) => Promise<void>;
        spIsLoggedIn: () => boolean;
        spotifyLogin: () => void;
        spotifyLogout: (shouldReload?: boolean) => void;
        getLikes: () => any[];
        getFollowedArtists: () => ArtistData[];
        setFollowedArtists: (artists: ArtistData[]) => void;
    }
}
