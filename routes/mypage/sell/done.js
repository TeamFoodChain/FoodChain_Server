const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.render('index', { title: 'mypage/sell/done' });
});


module.exports = router;
