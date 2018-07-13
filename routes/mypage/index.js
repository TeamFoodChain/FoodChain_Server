const express = require('express');
const router = express.Router();
 
const profileRouter = require('./profile');
const bookmarkRouter = require('./bookmark');
const basketRouter = require('./basket');
const commentRouter = require('./comment');
const buyRouter = require('./buy');
const sellRouter = require('./sell/index');
 
router.get('/', (req, res, next) => {
  res.render('index', { title: 'mypage' });
});
 
router.use('/bookmark', bookmarkRouter);
router.use('/profile', profileRouter);
router.use('/basket', basketRouter);
router.use('/comment', commentRouter);
router.use('/buy', buyRouter);
router.use('/sell', sellRouter);

module.exports = router;