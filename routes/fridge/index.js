const express = require('express');
const router = express.Router();

const fridgeRouter = require('./fridge');
const cameraRouter = require('./camera');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'fridge/index' });
});

router.use('/fridge', fridgeRouter);
router.use('/fridge/camera', cameraRouter);


module.exports = router;
