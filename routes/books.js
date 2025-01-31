const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const result = await pool.query('SELECT * FROM Books ORDER BY title LIMIT $1 OFFSET $2', [limit, offset]);

        const countResult = await pool.query('SELECT COUNT(*) FROM Books');
        const totalBooks = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalBooks / limit);

        res.render('books', {
            books: result.rows,
            user: req.session.user,
            errors: [],
            title: '',
            author: '',
            genre: '',
            publication_year: '',
            copies_available: '',
            page,
            totalPages
        });
    } catch (err) {
        console.error('Błąd podczas pobierania książek:', err.message);
        res.status(500).send('Błąd serwera');
    }
});


router.post(
    '/',
    ensureAuthenticated,
    ensureAdmin,
    [
        body('title').notEmpty().withMessage('Tytuł jest wymagany.'),
        body('author').notEmpty().withMessage('Autor jest wymagany.'),
        body('publication_year').notEmpty().isInt({ min: 500, max: new Date().getFullYear() }).withMessage('Podaj poprawny rok wydania.'),
        body('copies_available').isInt({ min: 1 }).withMessage('Liczba egzemplarzy musi wynosić co najmniej 1.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('books', {
                books: [],
                errors: errors.array(),
                user: req.session.user,
                title: req.body.title,
                author: req.body.author,
                genre: req.body.genre,
                publication_year: req.body.publication_year,
                copies_available: req.body.copies_available
            });
        }

        const { title, author, genre, publication_year, copies_available } = req.body;
        try {
            await pool.query(
                `INSERT INTO Books (title, author, genre, publication_year, copies_available)
                 VALUES ($1, $2, $3, $4, $5)`,
                [title, author, genre, publication_year, copies_available]
            );
            res.redirect('/books');
        } catch (err) {
            console.error('Błąd podczas dodawania książki:', err.message);
            res.status(500).send('Błąd serwera');
        }
    }
);


module.exports = router;
