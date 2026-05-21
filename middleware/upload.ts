import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const type = file.fieldname === 'photo' ? 'profiles' : 'covers';
    const dir  = `public/uploads/${type}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const prefix = file.fieldname === 'photo' ? 'profile' : 'playlist';
    const userId = req.session?.userId ?? 'anon';
    cb(null, `${prefix}-${userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({ storage });
