/**
 * Recording Module Routes Index
 */

// ExpressJS Core
const express = require('express');
const router = express.Router();
// Controllers
const ctrl = require('./controllers/controller');

// Routes

router.get('/', ctrl.Index);

router.post('/', ctrl.Create);

router.get('/:id', ctrl.Single);

router.put('/:id', ctrl.Update);

router.delete('/:id', ctrl.Delete);

module.exports = router;
