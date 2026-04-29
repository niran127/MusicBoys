import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import User from './models/User.js';
import Playlist from './models/Playlist.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3050;
// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/musicboys';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Middleware
app.use(express.static('public'));
app.use('/scripts', express.static('dist/public/scripts'));
app.use('/scripts', express.static('public/scripts'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // zet op true bij https
        httpOnly: true
    }
}));
// Auth Middleware
const requireAuth = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};
// Routes
app.get('/login', (req, res) => {
    if (req.session.userId)
        return res.redirect('/');
    res.render('login', { error: null });
});
app.post('/login', async (req, res) => {
    const { username, password, remember } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.render('login', { error: 'Gebruikersnaam of wachtwoord is incorrect' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.render('login', { error: 'Gebruikersnaam of wachtwoord is incorrect' });
        req.session.userId = user._id.toString();
        if (remember) {
            if (req.session.cookie) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
            }
        }
        res.redirect('/');
    }
    catch (err) {
        res.render('login', { error: 'Er is een fout opgetreden' });
    }
});
app.get('/register', (req, res) => {
    if (req.session.userId)
        return res.redirect('/');
    res.render('register', { error: null });
});
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existing = await User.findOne({ username });
        if (existing)
            return res.render('register', { error: 'Gebruikersnaam is al bezet' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        req.session.userId = newUser._id.toString();
        res.redirect('/');
    }
    catch (err) {
        res.render('register', { error: 'Registratie mislukt' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});
app.get('/', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.redirect('/login');
        const playlists = await Playlist.find({ ownerId: user._id });
        res.render('index', {
            user: {
                name: user.displayName || user.username,
                id: user._id,
                spotifyId: user.spotifyId
            },
            playlists
        });
    }
    catch (err) {
        res.redirect('/login');
    }
});
app.post('/api/user/sync', requireAuth, async (req, res) => {
    try {
        const { id, name } = req.body;
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        user.spotifyId = id;
        user.displayName = name || user.displayName;
        await user.save();
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/user/mood', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.session.userId, { currentMood: req.body.mood });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/user/last-played', requireAuth, async (req, res) => {
    try {
        const { uri, meta } = req.body;
        await User.findByIdAndUpdate(req.session.userId, {
            lastPlayedTrack: { uri, meta }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/user/likes', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        let likes = user ? user.likedTracks : [];
        const formatted = likes.map(t => {
            let obj = t.toObject ? t.toObject() : t;
            if (!obj.meta) {
                obj.meta = { name: obj.name, artist: obj.artist, image: obj.image, artistUri: null };
            }
            return obj;
        });
        res.json(formatted);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/user/likes', requireAuth, async (req, res) => {
    try {
        const { track } = req.body;
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.status(404).send('User not found');
        if (!user.likedTracks.some(t => t.id === track.id)) {
            user.likedTracks.push(track);
            await user.save();
        }
        res.json(user.likedTracks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/user/likes/:trackId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.status(404).send('User not found');
        user.likedTracks = user.likedTracks.filter(t => t.id !== req.params.trackId);
        await user.save();
        res.json(user.likedTracks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/user/artists', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.json(user ? user.followedArtists : []);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/user/artists', requireAuth, async (req, res) => {
    try {
        const { artist } = req.body;
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.status(404).send('User not found');
        if (!user.followedArtists.some(a => a.id === artist.id)) {
            user.followedArtists.push(artist);
            await user.save();
        }
        res.json(user.followedArtists);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/user/artists/:artistId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user)
            return res.status(404).send('User not found');
        user.followedArtists = user.followedArtists.filter(a => a.id !== req.params.artistId);
        await user.save();
        res.json(user.followedArtists);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/user/playlists', requireAuth, async (req, res) => {
    try {
        const playlists = await Playlist.find({ ownerId: req.session.userId });
        const formatted = playlists.map(p => {
            let plo = p.toObject ? p.toObject() : p;
            plo.tracks = (plo.tracks || []).map((t) => {
                if (!t.meta) {
                    t.meta = { name: t.name, artist: t.artist, image: t.albumArt, artistUri: null };
                }
                return t;
            });
            return plo;
        });
        res.json(formatted);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/playlists', requireAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        const newPlaylist = new Playlist({ name, description, ownerId: req.session.userId });
        await newPlaylist.save();
        res.status(201).json(newPlaylist);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.patch('/api/playlists/:id/tracks', requireAuth, async (req, res) => {
    try {
        const { track, tracks } = req.body;
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist)
            return res.status(404).send('Playlist not found');
        const trackList = tracks || (track ? [track] : []);
        for (const t of trackList) {
            const trackObj = {
                uri: t.uri,
                id: t.id || (t.uri ? t.uri.split(':').pop() : null),
                meta: t.meta || t
            };
            playlist.tracks.push(trackObj);
        }
        await playlist.save();
        res.json(playlist);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/playlists/:id/tracks/:trackId', requireAuth, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist)
            return res.status(404).send('Playlist not found');
        playlist.tracks = playlist.tracks.filter(t => t.id !== req.params.trackId);
        await playlist.save();
        res.json(playlist);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/playlists/:id', requireAuth, async (req, res) => {
    try {
        await Playlist.findByIdAndDelete(req.params.id);
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/user/game-score', requireAuth, async (req, res) => {
    try {
        res.status(200).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.patch('/api/user/mood', requireAuth, async (req, res) => {
    try {
        const { mood } = req.body;
        await User.findByIdAndUpdate(req.session.userId, { currentMood: mood });
        res.status(200).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
