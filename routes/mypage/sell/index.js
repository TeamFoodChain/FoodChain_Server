const express = require('express');
const router = express.Router();

const ingRouter = require('./ing');
const doneRouter = require('./done');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'mypage/sell' });
});

router.use('/ing', ingRouter);
router.use('/done', doneRouter);


module.exports = router;
