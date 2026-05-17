/**
 * Call Module Routes Index
 */

// ExpressJS Core
const express = require('express');
const router = express.Router();

// Controllers
const ctrl = require('./controllers/controller');

// Routes

router.post('/', ctrl.Create);

module.exports = router;
