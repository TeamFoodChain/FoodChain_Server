var express = require('express');
var router = express.Router();

const usersRouter = require('./users/index');
const timesaleRouter = require('./timesale/index');
const notificationRouter = require('./notification/index');
const mypageRouter = require('./mypage/index');
const marketRouter = require('./market/index');
const homeRouter = require('./home/index');
const fridgeRouter = require('./fridge/index');
const payRouter = require('./pay/index');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//users
router.use('/users', usersRouter);
//타임세일 탭
router.use('/timesale', timesaleRouter);
//알람 탭
router.use('/notification', notificationRouter);
//마이페이지 탭
router.use('/mypage', mypageRouter);
//마켓
router.use('/market', marketRouter);
//홈
router.use('/home', homeRouter);
//나만의 냉장고
router.use('/fridge', fridgeRouter);
//상품 결제
router.use('/pay', payRouter);


module.exports = router;
