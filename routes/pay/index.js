const express = require('express');
const router = express.Router();

const payRouter = require('./pay');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'pay/index' });
});

router.use('/', payRouter);


module.exports = router;
