const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');

router.get('/register', (req, res) => {
    res.render('register', { errors: [], username: '', email: '' });
});

router.get('/login', (req, res) => {
    res.render('login', { errors: [] });
});

router.post(
    '/register',
    [
        body('username')
            .trim()
            .isLength({ min: 3 })
            .withMessage('Nazwa użytkownika musi mieć co najmniej 3 znaki.')
            .custom(async (value) => {
                const userCheck = await pool.query('SELECT * FROM Users WHERE username = $1', [value]);
                if (userCheck.rows.length > 0) {
                    throw new Error('Nazwa użytkownika jest już zajęta.');
                }
                return true;
            }),
        body('email')
            .trim()
            .isEmail()
            .withMessage('Podaj poprawny adres email.')
            .custom(async (value) => {
                const emailCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [value]);
                if (emailCheck.rows.length > 0) {
                    throw new Error('Email jest już zajęty.');
                }
                return true;
            }),
        body('password').isLength({ min: 6 }).withMessage('Hasło musi mieć co najmniej 6 znaków.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('register', { errors: errors.array(), username: req.body.username, email: req.body.email });
        }

        const { username, password, email } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                `INSERT INTO Users (username, password, role, email) VALUES ($1, $2, 'user', $3)`,
                [username, hashedPassword, email]
            );
            res.redirect('/auth/login');
        } catch (err) {
            console.error('Błąd podczas rejestracji:', err.message);
            res.status(500).send('Błąd serwera');
        }
    }
);

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM Users WHERE username = $1', [username]);
        if (userCheck.rows.length === 0) {
            return res.status(400).render('login', { errors: [{ msg: 'Nieprawidłowa nazwa użytkownika lub hasło.' }] });
        }

        const user = userCheck.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).render('login', { errors: [{ msg: 'Nieprawidłowa nazwa użytkownika lub hasło.' }] });
        }

        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.redirect('/books');
    } catch (err) {
        console.error('Błąd podczas logowania:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Błąd podczas wylogowania:', err.message);
            return res.status(500).send('Błąd serwera');
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;
