const express = require('express');
const router = express.Router();

const modifyRouter = require('./modify');
const setRouter = require('./set');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users/choice' });
});

router.use('/modify', modifyRouter);
router.use('/set', setRouter);


module.exports = router;
