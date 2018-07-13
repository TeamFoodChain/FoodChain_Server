const express = require('express');
const router = express.Router();

const nativeRouter = require('./native');
const kakaoRouter = require('./kakao');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users' });
});

router.use('/native', nativeRouter);
router.use('/kakao', kakaoRouter);


module.exports = router;
