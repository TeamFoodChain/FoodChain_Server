const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.render('index', { title: 'home/category' });
});


module.exports = router;
