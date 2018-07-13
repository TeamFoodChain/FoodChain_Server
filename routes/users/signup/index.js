const express = require('express');
const router = express.Router();

const generalRouter = require('./general');
const supplierRouter = require('./supplier');
const checkRouter = require('./check/index');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users/signup' });
});

router.use('/general', generalRouter);
router.use('/supplier', supplierRouter);
router.use('/check', checkRouter);


module.exports = router;
