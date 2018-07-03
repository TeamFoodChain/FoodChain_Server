const express = require('express');
const router = express.Router();

const registerRouter = require('./register');
const cameraRouter = require('./camera');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'fridge' });
});

router.use('/register', registerRouter);
router.use('/camera', cameraRouter);


module.exports = router;
