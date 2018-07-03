const express = require('express');
const router = express.Router();

const showRouter = require('./show');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'timesale' });
});

router.use('/show', showRouter);


module.exports = router;
