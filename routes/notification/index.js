const express = require('express');
const router = express.Router();

const paymentRouter = require('./payment');
const recommendRouter = require('./recommend');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'notification' });
});

router.use('/payment', paymentRouter);
router.use('/recommend', recommendRouter);


module.exports = router;
