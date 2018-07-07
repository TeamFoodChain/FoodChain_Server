const express = require('express');
const router = express.Router();
const jwt = require('../../../module/jwt.js');

router.get('/', (req, res, next) => {
	let string = req.body.string;

	let token = jwt.sign("leesd556@gmail.com", "01021121891");

	res.status(201).send({
		message : "success",
		token : token
	});
    //res.render('index', { title: 'fridger/store/list' });
});


module.exports = router;
