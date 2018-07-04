const express = require('express');
const router = express.Router();

const generalRouter = require('./general');
const supplierRouter = require('./supplier');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users/signup' });
});

router.use('/general', generalRouter);
router.use('/supplier', supplierRouter);


module.exports = router;
