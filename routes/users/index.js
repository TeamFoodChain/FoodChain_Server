const express = require('express');
const router = express.Router();

const signupRouter = require('./signup/index');
const signinRouter = require('./signin');
const locateRouter = require('./locate');
const choiceRouter = require('./choice/index');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'users' });
});

router.use('/signup', signupRouter);
router.use('/signin', signinRouter);
router.use('/locate', locateRouter);
router.use('/choice', choiceRouter);


module.exports = router;
