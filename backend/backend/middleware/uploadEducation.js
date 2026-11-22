const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const EDU_DIR = path.join(__dirname, '..', 'uploads', 'education');
fs.mkdirSync(EDU_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, EDU_DIR),
    filename: (_req, file, cb) => {
        // NEVER trust the original filename
        const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
        cb(null, crypto.randomUUID() + ext);
    }
});

function pdfOnly(_req, file, cb) {
    // MIME check is a first line of defence.
    // For real security, also validate magic bytes with `file-type`.
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
}

module.exports = multer({
    storage,
    fileFilter: pdfOnly,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});