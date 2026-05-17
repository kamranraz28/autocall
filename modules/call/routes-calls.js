/**
 * Calls History Routes Index
 */

// ExpressJS Core
const express = require('express');
const router = express.Router();

// Controllers
const ctrl = require('./controllers/controller');

// Routes

router.get('/', ctrl.Index);

module.exports = router;
