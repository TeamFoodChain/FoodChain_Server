const express = require('express');
const router = express.Router();

const manageRouter = require('./manage/index');
const storeRouter = require('./store/index');
const cameraRouter = require('./camera');


router.get('/', (req, res, next) => {
  res.render('index', { title: 'fridge' });
});

router.use('/manage', manageRouter);
router.use('/manage', storeRouter);
router.use('/fridge/camera', cameraRouter);


module.exports = router;
