const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowed = /^(image|video|audio)\//;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'), false);
};

exports.upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});
exports.uploadSingle = (field) => exports.upload.single(field);
exports.uploadArray = (field, max) => exports.upload.array(field, max);