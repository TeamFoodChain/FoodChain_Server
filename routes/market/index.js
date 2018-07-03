const express = require('express');
const router = express.Router();

const nearRouter = require('./near');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'market' });
});

router.use('/near', nearRouter);


module.exports = router;
