const express = require('express');
const router = express.Router();

const bookmarkRouter = require('./bookmark');
const commentRouter = require('./comment');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'mypage' });
});

router.use('/bookmark', bookmarkRouter);
router.use('/comment', commentRouter);


module.exports = router;
