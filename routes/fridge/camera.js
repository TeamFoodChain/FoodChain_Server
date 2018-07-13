const express = require('express');
const router = express.Router();
const request = require('request');
const multer = require('multer');
const async = require('async');
const upload = multer();
const pool = require('../../config/dbPool_async.js');
const s3 = require('../../config/s3multer.js');
const jwt = require('../../module/jwt.js');
const identifier = require('../../module/token_identifier.js');

router.post('/', upload.array('pro_img'), (req, res, next) => {
    let token = req.headers.token;
    
    let pro_img = [];

    let data = {};

    let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
			let email;
			return new Promise((resolve, reject)=>{
				identifier(token, function(err, result){
					if(err) reject(err);
					else resolve(result);
				});
			}).then(function(identify_data){
				callback(null, identify_data);
			}).catch(function(err){
				res.status(500).send({
					message : err
				});
				console.log(err);
				callback(err);
				return ;
			});
		},
		// 2. pool에서 connection 하나 가져오기
		function(identify_data, callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					res.status(500).send({
						message: "Internal Server Error"
					}); 
					callback("pool.getConnection Error : " + err);
				} else {
					callback(null, connection, identify_data);
				}
			});
		},
		function(connection, identify_data, callback){
			if(req.files.length != 0){ // 이미지 db, s3에 저장
				console.log(req.files);
			// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
			for(let i = 0 ; i < req.files.length ; i++){
				pro_img[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + req.files[i].originalname.split('.').pop();
					//s3.upload(req.files[i]);
				}
				(async function(){
					let result = await s3.upload(req.files);
					callback(null, connection);
				})();
			} else {
				res.status(400).send({
					message : "No Image"
				});
				connection.release();
				callback("No Image");
				
			}
		},
    	function(connection, callback){
    		let option = { // 인식 인식
            	uri : 'http://210.94.194.122:5511/im_classify/',
            	method : 'POST',
            	body : pro_img[0],
            	json : true
            	// postData : pro_img (image url)
        	};

        	let result = request(option, (err, response, body) =>{
            	if(err){
            		res.status(400).send({
            			message : "Fail to Get Data"
            		});
	                console.log("Fail to Get Data");
	                return;
	            } else {	   
	                console.log(response.body);
    	            //console.log(body);
    	            console.log(pro_img);

    	            data.pro_img = pro_img[0];
    	            if(response.body.length<40)
	    	            data.cate = response.body;
	    	        else
	    	        	data.cate = [];

    	            callback(null, "Success to Get Data");
    	        }
        	});
    	}
 
		];




    	async.waterfall(taskArray, async function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
					message : "Success to Get Data",
					data : data
				});
				console.log(result);
			}
		});	
	});


module.exports = router;