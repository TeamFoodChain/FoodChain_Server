var express = require('express');
var router = express.Router();

const authCtrl = require('../controllers/AuthCtrl');
const marketCtrl = require('../controllers/MarketCtrl');

router.get('/', function(req, res, next) {
  res.render('test', { title: 'test' });
});
/* GET home page. */
//router.get('/', authCtrl, marketCtrl);




module.exports = router;
