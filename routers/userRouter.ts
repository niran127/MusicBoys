import { Router, Request, Response } from 'express';
import User from '../models/User.js';
import Playlist from '../models/Playlist.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { errMsg } from '../utils/helpers.js';
import type {
  SyncBody, MoodBody, ThemeBody,
  LastPlayedBody, LikedTrack, FollowedArtist
} from '../interfaces/index.js';

const router = Router();

router.get('/app', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.redirect('/login'); return; }
    const playlists = await Playlist.find({ ownerId: user._id });
    res.render('index', {
      user: {
        name:            user.displayName || user.username,
        id:              user._id,
        spotifyId:       user.spotifyId,
        profileImageUrl: user.profileImageUrl,
        preferredTheme:  user.preferredTheme || 'dark'
      },
      playlists,
      spClientId: process.env.SP_CLIENT_ID
    });
  } catch { res.redirect('/login'); }
});

router.post('/api/user/sync', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id, name } = req.body as SyncBody;
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.spotifyId   = id;
    user.displayName = name || user.displayName;
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/mood', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { mood } = req.body as MoodBody;
  try {
    await User.findByIdAndUpdate(req.session.userId, { currentMood: mood });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.patch('/api/user/mood', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { mood } = req.body as MoodBody;
  try {
    await User.findByIdAndUpdate(req.session.userId, { currentMood: mood });
    res.status(200).send();
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.patch('/api/user/theme', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { theme } = req.body as ThemeBody;
  try {
    await User.findByIdAndUpdate(req.session.userId, { preferredTheme: theme });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/last-played', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uri, meta } = req.body as LastPlayedBody;
  try {
    await User.findByIdAndUpdate(req.session.userId, { lastPlayedTrack: { uri, meta } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/profile-photo', requireAuth, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;
    await User.findByIdAndUpdate(req.session.userId, { profileImageUrl });
    res.json({ profileImageUrl });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.get('/api/user/likes', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    let likes: any[] = user ? [...user.likedTracks] : [];
    likes.sort((a, b) => {
      const dA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
      const dB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
      return dB - dA;
    });
    likes = likes.map((t: any) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      if (!obj.meta) obj.meta = { name: obj.name, artist: obj.artist, image: obj.image, artistUri: null };
      return obj;
    });
    res.json(likes);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/likes', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { track } = req.body as { track: LikedTrack };
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.status(404).send('User not found'); return; }
    if (!user.likedTracks.some((t: any) => t.id === track.id)) {
      user.likedTracks.push({ ...track, dateAdded: new Date() } as any);
      await user.save();
    }
    res.json(user.likedTracks);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.delete('/api/user/likes/:trackId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.status(404).send('User not found'); return; }
    (user.likedTracks as any) = user.likedTracks.filter((t: any) => t.id !== req.params.trackId);
    await user.save();
    res.json(user.likedTracks);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.get('/api/user/artists', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    res.json(user ? user.followedArtists : []);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/artists', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { artist } = req.body as { artist: FollowedArtist };
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.status(404).send('User not found'); return; }
    if (!user.followedArtists.some((a: any) => a.id === artist.id)) {
      user.followedArtists.push(artist as any);
      await user.save();
    }
    res.json(user.followedArtists);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.delete('/api/user/artists/:artistId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.status(404).send('User not found'); return; }
    (user.followedArtists as any) = user.followedArtists.filter((a: any) => a.id !== req.params.artistId);
    await user.save();
    res.json(user.followedArtists);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/user/game-score', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  res.status(200).send();
});

router.get('/api/user/playlists', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const playlists = await Playlist.find({ ownerId: req.session.userId });
    const formatted = playlists.map((p: any) => {
      const plo = p.toObject ? p.toObject() : p;
      plo.tracks = (plo.tracks || []).map((t: any) => {
        if (!t.meta) t.meta = { name: t.name, artist: t.artist, image: t.albumArt, artistUri: null };
        return t;
      });
      return plo;
    });
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

export default router;
