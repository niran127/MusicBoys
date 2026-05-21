import { Router, Request, Response } from 'express';
import Playlist from '../models/Playlist.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { errMsg } from '../utils/helpers.js';
import type { CreatePlaylistBody, AddTrackBody, UpdateTitleBody } from '../interfaces/index.js';

const router = Router();

router.post('/api/playlists', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, description, tracks } = req.body as CreatePlaylistBody;
  try {
    const existing = await Playlist.findOne({ name: name?.trim(), ownerId: req.session.userId });
    if (existing) {
      res.status(409).json({ error: `Je hebt al een playlist met de naam "${name?.trim()}".` });
      return;
    }
    const tracksList = (tracks || []).map(t => ({
      uri:  t.uri,
      id:   t.id ?? (t.uri ? t.uri.split(':').pop() : null),
      meta: t.meta ?? { name: (t as any).name, artist: (t as any).artist, image: (t as any).image }
    }));
    const newPlaylist = new Playlist({ name: name?.trim(), description, ownerId: req.session.userId, tracks: tracksList });
    await newPlaylist.save();
    res.status(201).json(newPlaylist);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.patch('/api/playlists/:id/tracks', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { track, tracks } = req.body as AddTrackBody;
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) { res.status(404).send('Playlist not found'); return; }
    const trackList = tracks ?? (track ? [track] : []);
    for (const t of trackList) {
      playlist.tracks.push({
        uri:  t.uri,
        id:   t.id ?? (t.uri ? t.uri.split(':').pop() : undefined),
        meta: t.meta ?? (t as any)
      } as any);
    }
    await playlist.save();
    res.json(playlist);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.patch('/api/playlists/:id/title', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body as UpdateTitleBody;
  try {
    const duplicate = await Playlist.findOne({
      name:    name?.trim(),
      ownerId: req.session.userId,
      _id:     { $ne: req.params.id }
    });
    if (duplicate) {
      res.status(409).json({ error: `Je hebt al een playlist met de naam "${name?.trim()}".` });
      return;
    }
    const updated = await Playlist.findByIdAndUpdate(req.params.id, { name: name?.trim() }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.post('/api/playlists/:id/cover-upload', requireAuth, upload.single('cover'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const coverUrl = `/uploads/covers/${req.file.filename}`;
    await Playlist.findByIdAndUpdate(req.params.id, { coverUrl });
    res.json({ coverUrl });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.delete('/api/playlists/:id/tracks/:trackId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) { res.status(404).send('Playlist not found'); return; }
    (playlist.tracks as any) = playlist.tracks.filter((t: any) => t.id !== req.params.trackId);
    await playlist.save();
    res.json(playlist);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

router.delete('/api/playlists/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

export default router;
