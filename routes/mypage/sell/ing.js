const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.render('index', { title: 'mypage/sell/ing' });
});


module.exports = router;
