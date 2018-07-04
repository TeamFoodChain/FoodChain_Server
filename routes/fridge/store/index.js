const express = require('express');
const router = express.Router();

const registerRouter = require('./register');
const listRouter = require('./list');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'fridge/store' });
});

router.use('/register', registerRouter);
router.use('/list', listRouter);


module.exports = router;
