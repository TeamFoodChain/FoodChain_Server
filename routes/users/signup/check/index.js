const express = require('express');
const router = express.Router();

const emailRouter = require('./email_check');
const phoneRouter = require('./phone_check');
const passwordRouter = require('./pw_check');
const registNumRouter = require('./regist_num_check');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users/signup' });
});

router.use('/email', emailRouter);
router.use('/phone', phoneRouter);
router.use('/pw', passwordRouter);
router.use('/regist', registNumRouter);


module.exports = router;
