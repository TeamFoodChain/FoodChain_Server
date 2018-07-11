const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer();

const usersRouter = require('./users/index');
const timesaleRouter = require('./timesale/index');
const notificationRouter = require('./notification/index');
const mypageRouter = require('./mypage/index');
const marketRouter = require('./market/index');
const homeRouter = require('./home/index');
const fridgeRouter = require('./fridge/index');
const payRouter = require('./pay/pay'); // 경제 관련해서 추가되면 나중에 pay/index로 돌리기


const authCtrl = require('../controllers/AuthCtrl');
const homeCtrl = require('../controllers/HomeCtrl');
const fridgeCtrl = require('../controllers/FridgeCtrl');

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

router.get('/test1', authCtrl.auth, homeCtrl.category); 
router.get('/test2', authCtrl.auth, homeCtrl.main);
router.get('/test3', authCtrl.auth, homeCtrl.product);
router.post('/test4', upload.array('pro_img'), authCtrl.auth, fridgeCtrl.storeRegister); // fridge/store/register
router.delete('/test5', authCtrl.auth, fridgeCtrl.storeRegisterDelete); // fridge/store/register
router.get('/test6', authCtrl.auth, fridgeCtrl.storeList); // fridge/store/list
router.post('/test7', upload.array('pro_img'), authCtrl.auth, fridgeCtrl.manageRegister); // fridge/manage/register
router.delete('/test8', authCtrl.auth, fridgeCtrl.manageRegisterDelete); // fridge/manage/register
router.get('/test9', authCtrl.auth, fridgeCtrl.manageList); // fridge/manage/list


module.exports = router;
