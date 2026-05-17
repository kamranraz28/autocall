/**
 * Billing Module Routes Index
 */

// ExpressJS Core
const express = require('express');
const router = express.Router();

// Controllers
const ctrl = require('./controllers/controller');

// Routes

router.get('/wallet', ctrl.GetWallet);

router.put('/wallet', ctrl.UpdateWallet);

module.exports = router;
