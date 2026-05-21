import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter     from './routers/authRouter.js';
import userRouter     from './routers/userRouter.js';
import playlistRouter from './routers/playlistRouter.js';

declare module 'express-session' {
  interface SessionData { userId: string; }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3050;

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/musicboys')
  .then(() => console.log('MongoDB verbonden'))
  .catch(err => console.error('MongoDB fout:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
}));

app.use('/', authRouter);
app.use('/', userRouter);
app.use('/', playlistRouter);

app.listen(PORT, () => console.log(`Server draait op http://localhost:${PORT}`));
