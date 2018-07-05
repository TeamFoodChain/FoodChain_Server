const express = require('express');
const router = express.Router();
const async = require('async');
const upload = require('../../config/s3multer.js');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');


router.get('/', (req, res) => {
	var bookmark_info = new Array();
	var product = {};
	var product_image = new Array();

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	// token verify
	if (decoded == -1) {
		res.status(500).send({
			message : "token err"
		});
	}

	let email = decoded.email;
	let phone = decoded.phone;

	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					res.status(500).send({
						message: "Internal Server Error"
					}); 
					callback("pool.getConnection Error : " + err);
				} else {
					callback(null, connection);
				}
			});
		},
		// 2. token과 비교하기 위해 supplier table에서 idx, email, phone number를 가져옴
		function(connection, callback){
			let getUserDataQuery = "SELECT sup_idx, sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
			connection.query(getUserDataQuery, token, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					connection.release();
					callback("connection.query Error : " + err);
				} else {
					if(email === result[0].sup_email && phone === result[0].sup_phone){
						console.log("success to verify");
					} else {
						res.status(400).send({
							message : "Invalid token error"
						});
						connection.release();
						callback("Invalid token error");
					}
					callback(null, connection, result[0].sup_idx);
				}
			});
		},
		// 3. token 값이 옳으면, 해당 idx를 가져와서 북마크한 상품이 뭔지 파악한다.
		function(connection, sup_idx, callback){
			// user or sup index를 사용하여 product index를 가져온다.
			let getSupBookmarkIdxQuery = "SELECT pro_idx FROM bookmark WHERE sup_idx = ?";
			connection.query(getSupBookmarkIdxQuery, [sup_idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				}
				callback(null, connection, result); 
			});
		},
		// 4. 받아온 pro_idx로 북마크 정보를 조회한다.
		function(connection, pro_idx, callback){
			let getBookmarkProductQuery = '';
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";


			for(let i = 0 ; i < pro_idx.length ; i++){
				getBookmarkProductQuery += "SELECT * FROM product NATURAL JOIN market NATURAL JOIN product_image WHERE pro_idx = " + pro_idx[i].pro_idx + ";";
			}
			console.log(getBookmarkProductQuery);


				connection.query(getBookmarkProductQuery, function(err, result){
						console.log("Asdasdasd" +result);
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
					} else{
						console.log("Asdasdasd" +result);
						product.pro_idx = result[0].pro_idx;
						product.pro_name = result[0].pro_name;
						product.pro_price = result[0].pro_price;
						product.pro_sale_price = result[0].pro_sale_price;
						product.pro_info = result[0].pro_info;
						bookmark_info[i] = {};
						bookmark_info[i].product = product;

						//여기서 구글 api와 market의 주소, 위치 값을 이용해서 거리를 알려준다.
					}

				});
				connection.query(getProductImageQuery, [pro_idx[i].pro_idx], function(err, result){
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
					} else{
						if(result != 0){
						for(let j = 0 ; j < result.length ; j++){
							product_image[j] = result[j].pro_img;
						}
							bookmark_info[i].product.pro_img = product_image.slice(0);
						}
					}
				});


			// res.status(200).send({
			// 	message : "Success to load",
			// 	data : bookmark_info
			// });
			//callback(null, "Success to load");
			connection.release();
		}
		];

    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {

			console.log(bookmark_info);
			console.log(result);
		}
	});
});


module.exports = router;
