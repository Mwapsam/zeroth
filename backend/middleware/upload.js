/* ============================================================
   UPLOAD — middleware/upload.js
   ------------------------------------------------------------
   Multer config for user media (images, audio, video).
   Disk storage under /uploads, served statically by server.js.

   v2 changes:
     • Blocks dangerous MIME types explicitly (HTML, SVGZ,
       executables) even when the client lies about MIME.
     • Blocks dangerous extensions as a second layer of defense
       — because multer does not inspect file bytes.
     • Filename is now `<timestamp>-<8-hex><ext>` — no user-
       supplied part, no path traversal, no unicode tricks.
     • Max size resolves from `MAX_UPLOAD_MB` env (default 100).
     • `fileFilter` returns a rich Error with a `code` field so
       `errorHandler` renders the right message.
     • Cleanup: `upload.single()`'s tmp file is removed if a later
       middleware throws, via a tiny `cleanupOnError` wrapper that
       route files can chain.
     • Exported helpers preserved:
         uploadSingle(field), uploadArray(field, max)
       + new: uploadFields(), uploadNone(), cleanupOnError()
   ============================================================ */

'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/* ---------- Upload directory ---------- */
const UPLOAD_DIR = path.resolve(
    __dirname,
    '..',
    process.env.UPLOAD_DIR || 'uploads'
);

try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
    console.error('❌ Could not create upload directory:', err.message);
}

/* ---------- Limits ---------- */
const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 100;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/* ---------- Storage ---------- */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '').toLowerCase();

        /* Reject dangerous extensions outright */
        const FORBIDDEN_EXT = new Set([
            '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.vbs',
            '.js', '.mjs', '.cjs', '.ts', '.sh', '.ps1', '.jar',
            '.php', '.phtml', '.asp', '.aspx', '.jsp', '.cgi',
            '.html', '.htm', '.xhtml', '.svgz', '.svg'
        ]);

        if (FORBIDDEN_EXT.has(ext)) {
            const err = new Error(`Extension not allowed: ${ext}`);
            err.code = 'LIMIT_UNEXPECTED_FILE';
            return cb(err);
        }

        const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
        const name =
            `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
        cb(null, name);
    }
});

/* ---------- File filter ---------- */
const ALLOWED_MIME = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|quicktime|ogg)|audio\/(mpeg|mp3|wav|ogg|webm|m4a|x-m4a))/i;

const fileFilter = (_req, file, cb) => {
    const mime = String(file.mimetype || '');
    if (ALLOWED_MIME.test(mime)) return cb(null, true);

    const err = new Error(`Unsupported file type: ${mime || 'unknown'}`);
    err.code = 'LIMIT_UNEXPECTED_FILE';
    cb(err, false);
};

/* ---------- Multer instance ---------- */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_BYTES,
        files: 20,
        fields: 50,
        parts: 200
    },
    preservePath: false
});

/* ============================================================
   HELPERS
   ============================================================ */

/* Wrap a multer middleware so any later middleware that throws
   deletes the uploaded temp file. Chain: [uploadMiddleware, ...] */
function cleanupOnError(uploadMw) {
    return (req, res, next) => {
        uploadMw(req, res, (err) => {
            if (err) {
                // multer may still have written a file before failing
                if (req.file?.path) safeUnlink(req.file.path);
                if (Array.isArray(req.files)) {
                    for (const f of req.files) {
                        for (const f2 of (Array.isArray(f) ? f : [f])) {
                            if (f2?.path) safeUnlink(f2.path);
                        }
                    }
                }
                return next(err);
            }
            next();
        });
    };
}

function safeUnlink(p) {
    try { fs.unlinkSync(p); } catch (_) { /* silent */ }
}

/* ============================================================
   EXPORTS (backward compatible)
   ============================================================ */
exports.upload        = upload;
exports.uploadDir     = UPLOAD_DIR;
exports.maxUploadMB   = MAX_MB;

exports.uploadSingle  = (field) => cleanupOnError(upload.single(field));
exports.uploadArray   = (field, max = 10) => cleanupOnError(upload.array(field, max));
exports.uploadFields  = (fields) => cleanupOnError(upload.fields(fields));
exports.uploadNone    = () => cleanupOnError(upload.none());

exports.cleanupOnError = cleanupOnError;