const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');

router.get('/', ensureAuthenticated, ensureAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
        'SELECT id, username, email, role, created_at FROM Users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM Users');
    const totalUsers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('users', { users: result.rows, user: req.session.user, page, totalPages });
  } catch (err) {
    console.error('Błąd podczas pobierania użytkowników:', err.message);
    res.status(500).send('Błąd serwera');
  }
});

router.post('/promote/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    await pool.query('UPDATE Users SET role = $1 WHERE id = $2', ['admin', userId]);
    res.redirect('/users');
  } catch (err) {
    console.error('Błąd podczas mianowania użytkownika administratorem:', err.message);
    res.status(500).send('Błąd serwera');
  }
});

module.exports = router;
