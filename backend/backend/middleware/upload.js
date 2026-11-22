const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_MB = Number(process.env.MAX_FILE_SIZE_MB || 100);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function storageFor(subdir) {
  const dir = path.join(UPLOAD_DIR, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${nanoid(10)}${ext}`);
    }
  });
}

function makeUploader(subdir, allowed = /jpeg|jpg|png|webp|gif|pdf|mp4|mp3|m4a/, maxMb = MAX_MB) {
  const mimeRegex = new RegExp(allowed.source, 'i');
  return multer({
    storage: storageFor(subdir),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!mimeRegex.test(file.mimetype) && !mimeRegex.test(path.extname(file.originalname))) {
        return cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
      cb(null, true);
    }
  });
}

module.exports = {
  imageUpload: makeUploader('images', /jpeg|jpg|png|webp|gif/),
  pdfUpload: makeUploader('pdfs', /pdf/),
  mediaUpload: makeUploader('media', /jpeg|jpg|png|webp|mp4|mp3|m4a|webm/),
  ensureDir
};