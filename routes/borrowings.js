const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');

async function recordExists(table, column, value) {
    const query = `SELECT EXISTS (SELECT 1 FROM ${table} WHERE ${column} = $1)`;
    const result = await pool.query(query, [value]);
    return result.rows[0].exists;
}

router.get('/', ensureAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        let query;
        let params = [limit, offset];

        if (req.session.user.role === 'admin') {
            query = `
                SELECT b.id AS borrowing_id, u.username, bk.title, b.borrowed_at, b.due_date, b.returned_at
                FROM Borrowings b
                JOIN Users u ON b.user_id = u.id
                JOIN Books bk ON b.book_id = bk.id
                ORDER BY b.borrowed_at DESC
                LIMIT $1 OFFSET $2
            `;
        } else {
            query = `
                SELECT b.id AS borrowing_id, bk.title, b.borrowed_at, b.due_date, b.returned_at
                FROM Borrowings b
                JOIN Books bk ON b.book_id = bk.id
                WHERE b.user_id = $3
                ORDER BY b.borrowed_at DESC
                LIMIT $1 OFFSET $2
            `;
            params.push(req.session.user.id);
        }

        const result = await pool.query(query, params);

        let countQuery = req.session.user.role === 'admin'
            ? `SELECT COUNT(*) FROM Borrowings`
            : `SELECT COUNT(*) FROM Borrowings WHERE user_id = $1`;
        let countParams = req.session.user.role === 'admin' ? [] : [req.session.user.id];
        const countResult = await pool.query(countQuery, countParams);
        const totalBorrowings = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalBorrowings / limit);

        res.render('borrowings', {
            borrowings: result.rows,
            user: req.session.user,
            errors: [],
            book_id: '',
            due_date: '',
            user_id: '',
            page,
            totalPages
        });
    } catch (err) {
        console.error('Błąd podczas pobierania wypożyczeń:', err.message);
        res.status(500).send('Błąd serwera');
    }
});


router.post(
    '/',
    ensureAuthenticated,
    [
        body('book_id')
            .isInt({ min: 1 }).withMessage('Podaj poprawne ID książki.')
            .custom(async (value) => {
                const exists = await recordExists('Books', 'id', value);
                if (!exists) {
                    throw new Error('Podana książka nie istnieje.');
                }
                return true;
            }),
        body('due_date')
            .isISO8601().withMessage('Podaj poprawną datę zwrotu.'),
        body('user_id')
            .optional()
            .custom(async (value, { req }) => {
                if (req.session.user.role === 'admin') {
                    if (!value) {
                        throw new Error('Administrator musi podać ID użytkownika.');
                    }
                    const exists = await recordExists('Users', 'id', value);
                    if (!exists) {
                        throw new Error('Podany użytkownik nie istnieje.');
                    }
                }
                return true;
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const page = parseInt(req.query.page) || 1;
        const totalPages = 1; // Default value in case of error

        if (!errors.isEmpty()) {
            return res.status(400).render('borrowings', {
                borrowings: [],
                user: req.session.user,
                errors: errors.array(),
                book_id: req.body.book_id,
                due_date: req.body.due_date,
                user_id: req.body.user_id || '',
                page, // Ensure page is always defined
                totalPages // Ensure totalPages is always defined
            });
        }

        const { user_id, book_id, due_date } = req.body;
        const finalUserId = req.session.user.role === 'admin' ? user_id : req.session.user.id;

        try {
            await pool.query(
                `INSERT INTO Borrowings (user_id, book_id, due_date)
                 VALUES ($1, $2, $3)`,
                [finalUserId, book_id, due_date]
            );
            res.redirect('/borrowings');
        } catch (err) {
            console.error('Błąd podczas dodawania wypożyczenia:', err.message);
            res.status(500).send('Błąd serwera');
        }
    }
);


router.post('/return', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { borrowing_id } = req.body;

    try {
        await pool.query(
            `UPDATE Borrowings SET returned_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [borrowing_id]
        );
        res.redirect('/borrowings');
    } catch (err) {
        console.error('Błąd podczas zwrotu książki:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
