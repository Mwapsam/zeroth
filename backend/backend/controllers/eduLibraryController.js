const EduBook = require('../models/EduBook');
const path    = require('path');
const fs      = require('fs');

const EDU_DIR = path.join(__dirname, '..', 'uploads', 'education');

/* GET /api/education/library */
exports.listBooks = async (_req, res, next) => {
    try {
        const books = await EduBook
            .find()
            .sort({ createdAt: -1 })
            .lean();

        res.json(books.map(b => ({
            id:          b._id,
            title:       b.title,
            author:      b.author,
            price:       b.price,
            uploadedAt:  b.createdAt
        })));
    } catch (err) { next(err); }
};

/* POST /api/education/library/upload  (multipart/form-data) */
exports.uploadBook = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const book = await EduBook.create({
            title:        req.body.title || 'Untitled',
            author:       req.body.author || 'Unknown',
            price:        Math.max(0, parseFloat(req.body.price) || 0),
            filename:     req.file.filename,
            originalName: req.file.originalname,
            size:         req.file.size,
            uploadedBy:   req.user?._id   // only if your auth middleware sets req.user
        });

        res.status(201).json({
            id:         book._id,
            title:      book.title,
            author:     book.author,
            price:      book.price,
            uploadedAt: book.createdAt
        });
    } catch (err) {
        // Clean up the file if DB write failed
        if (req.file) fs.unlink(req.file.path, () => {});
        next(err);
    }
};

/* GET /api/education/library/:id/download */
exports.downloadBook = async (req, res, next) => {
    try {
        const book = await EduBook.findById(req.params.id).lean();
        if (!book) return res.status(404).json({ message: 'Book not found' });

        const filePath = path.join(EDU_DIR, book.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File missing on server' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(book.title)}.pdf"`
        );
        fs.createReadStream(filePath).pipe(res);
    } catch (err) { next(err); }
};