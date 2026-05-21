import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { errMsg } from '../utils/helpers.js';
import type { LoginBody, RegisterBody, SpotifyLoginBody } from '../interfaces/index.js';

const router = Router();

router.get('/login', (req: Request, res: Response): void => {
  if (req.session.userId) { res.redirect('/'); return; }
  res.render('login', { error: null });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password, remember } = req.body as LoginBody;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      res.render('login', { error: 'Gebruikersnaam of wachtwoord is incorrect' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.render('login', { error: 'Gebruikersnaam of wachtwoord is incorrect' });
      return;
    }
    req.session.userId = String(user._id);
    if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Er is een fout opgetreden' });
  }
});

router.get('/register', (req: Request, res: Response): void => {
  if (req.session.userId) { res.redirect('/'); return; }
  res.render('register', { error: null });
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as RegisterBody;
  try {
    const existing = await User.findOne({ username });
    if (existing) {
      res.render('register', { error: 'Gebruikersnaam is al bezet' });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.session.userId = String(newUser._id);
    res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { error: 'Registratie mislukt' });
  }
});

router.get('/logout', (req: Request, res: Response): void => {
  req.session.destroy(() => res.redirect('/login'));
});

// Koppelt een Spotify-account aan onze eigen gebruiker na een OAuth flow
router.post('/api/auth/spotify-login', async (req: Request, res: Response): Promise<void> => {
  const { spotifyId, displayName } = req.body as SpotifyLoginBody;
  try {
    let user = await User.findOne({ spotifyId });
    if (!user) {
      user = await User.findOne({ username: displayName });
      if (user) {
        user.spotifyId = spotifyId;
        await user.save();
      } else {
        user = new User({
          username:    displayName || `spotify_${spotifyId}`,
          spotifyId,
          displayName,
          password:    await bcrypt.hash(Math.random().toString(36), 10)
        });
        await user.save();
      }
    }
    req.session.userId = String(user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

// Proxy zodat de client_secret nooit in de browser terechtkomt
router.get('/api/spotify/token', async (_req: Request, res: Response): Promise<void> => {
  try {
    const credentials = Buffer
      .from(`${process.env.SP_CLIENT_ID}:${process.env.SP_CLIENT_SECRET}`)
      .toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + credentials },
      body:    'grant_type=client_credentials'
    });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) { res.redirect('/login'); return; }
    res.render('landing', {
      user: {
        name:            user.displayName || user.username,
        profileImageUrl: user.profileImageUrl,
        preferredTheme:  user.preferredTheme || 'dark'
      }
    });
  } catch { res.redirect('/login'); }
});

export default router;
