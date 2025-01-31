// Middleware do weryfikacji zalogowania
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login'); // Przekierowanie na stronę logowania
}

// Middleware do weryfikacji roli admina
function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Brak dostępu: tylko dla administratorów');
}

module.exports = { ensureAuthenticated, ensureAdmin };
