const express = require('express');
const router = express.Router();
const async = require('async');
const upload = require('../../config/s3multer.js');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const jwt = require('../../module/jwt.js');


router.get('/', (req, res) => {
	let bookmark_info = [];
	let product = {};
	let product_image = [];

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	// token verify
	if (decoded == -1) {
		res.status(500).send({
			message : "token err"
		});
	}

	let email = decoded.email;
	let pw = decoded.pw;
	let identify = decoded.identify;

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
		// 2. token과 비교, 나중에 token에서 식별 데이터를 받아서 테이블 구분하자.
		function(connection, callback){
			let getIdentifiedDataQuery ="";
			if(identify == 0) // user 일 때
				getIdentifiedDataQuery = "SELECT user_addr, user_addr_lat, user_addr_long, user_email, user_phone FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT sup_addr, sup_addr_lat, sup_addr_long, sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
			
			connection.query(getIdentifiedDataQuery, token, function(err, result){
				if(result.length == 0){ // 해당 토큰이 없다
					res.status(500).send({
						message : "Invalied User"
					});
					connection.release();
					callback("Invalied User");
					return;
				}

				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					connection.release();
					callback("connection.query Error : " + err);
				} else {
					if(identify == 0){ // user 일 때 
						console.log(result);
						if(email === result[0].user_email && phone === result[0].user_phone){
						console.log("success to verify");
					} else {
						res.status(400).send({
							message : "Invalid token error"
						});
						connection.release();
						callback("Invalid token error");
						return;
					}
					}

					else{ // supplier 일 때
					if(email === result[0].sup_email && phone === result[0].sup_phone){
						console.log("success to verify");
					} else {
						res.status(400).send({
							message : "Invalid token error"
						});
						connection.release();
						callback("Invalid token error");
						return;
					}
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
				callback(null, result);
				connection.release(); 
			});
		},
		// 4. 받아온 pro_idx로 북마크 정보를 조회한다.
		function(pro_idx, callback){
			let getBookmarkProductQuery = "SELECT * FROM product NATURAL JOIN market WHERE pro_idx = ?";

			(async function(){
				let connections = await pool_async.getConnection();

				let reserve = function(cb){
					process.nextTick(function(){
						cb(pro_idx);
					});
				}

				let makeReserve = function(i, pro_idx){
					reserve(async function(pro_idx){
						let value = pro_idx[i];
						console.log(value);
						console.log(value.pro_idx);
						let result = await pool_async.query(getBookmarkProductQuery, value.pro_idx);
						let data = result[0];
						product = {};
						product.pro_idx = data[0].pro_idx;
						product.pro_name = data[0].pro_name;
						product.pro_price = data[0].pro_price;
						product.pro_sale_price = data[0].pro_sale_price;
						product.pro_info = data[0].pro_info;
						bookmark_info[i] = {};
						bookmark_info[i].product = product;

						if(i + 1 == pro_idx.length){
						end();
						connections.release();
					}
				});
				}

				for(var i = 0 ; i < pro_idx.length ; i++){
					makeReserve(i, pro_idx);
				}

				let end = function(){
					callback(null, pro_idx);
				}
			})();

		},

		function(pro_idx, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

				(async function(){
				let connections = await pool_async.getConnection();

				let reserve = function(cb){
					process.nextTick(function(){
						cb(pro_idx);
					});
				}

				let makeReserve = function(i, pro_idx){
					reserve(async function(pro_idx){
						let value = pro_idx[i];
						let result = await pool_async.query(getProductImageQuery, value.pro_idx);
						let data = result[i];
						console.log(data);
						if(data.length != 0){
							product_image = [];
							for(let j = 0 ; j < data.length ; j++){
								product_image[j] = data[j].pro_img;
							}
							bookmark_info[i].product.pro_img = product_image.slice(0);
						}

						if(i + 1 == pro_idx.length){
						end();
						connections.release();
					}
				});
				}

				for(var i = 0 ; i < pro_idx.length ; i++){
					makeReserve(i, pro_idx);
				}

				let end = function(){
					res.status(200).send({
						message : "Success to load",
						data : bookmark_info
					});
					callback(null, "Success to load");
				}
			})();


		}
		];

    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {
			console.log(result);
		}
	});
});


module.exports = router;
