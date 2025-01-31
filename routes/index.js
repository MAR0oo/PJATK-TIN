var express = require('express');
var router = express.Router();

router.get('/', async function (req, res, next) {
  try {
    const pool = req.app.locals.db; // Uzyskanie puli połączeń z app.locals
    const result = await pool.query('SELECT NOW()');
    const serverTime = result.rows[0].now;

    res.render('index', { dbStatus: 'Połączono pomyślnie!', serverTime });
  } catch (error) {
    console.error('Błąd połączenia z bazą:', error.message);
    res.render('index', { dbStatus: 'Nie udało się połączyć z bazą!', serverTime: 'Brak danych' });
  }
});

module.exports = router;
