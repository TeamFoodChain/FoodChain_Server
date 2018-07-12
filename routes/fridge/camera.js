const express = require('express');
const router = express.Router();
const request = require('request');
const multer = require('multer');
const upload = multer();

router.post('/', upload.array('pro_img'), (req, res, next) => {
	console.log(req.files[0].buffer);
	var buf = new Buffer(req.files[0].buffer);
	let option = {
		uri : 'http://210.94.194.122:5511/im_classify/',
		method : 'POST',
		body : req.files,
		json : true
		// postData : req.files
	}

	let result = request(option, (err, response, body) =>{
		if(err){
			console.log("fail!");
			res.end("fail!");
		} else {
			console.log(response.body);
			console.log(body);
		}
	})
});


router.get('/', (req, res, next) => {
    res.render('index', { title: 'fridger/camera' });
});


module.exports = router;
