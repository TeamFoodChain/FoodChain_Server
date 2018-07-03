const express = require('express');
const router = express.Router();

const categoryRouter = require('./category');
const mainRouter = require('./main');
const productRouter = require('./product');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'home' });
});

router.use('/category', categoryRouter);
router.use('/main', mainRouter);
router.use('/product', productRouter);


module.exports = router;
