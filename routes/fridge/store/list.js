const express = require('express');
const router = express.Router();
const distance = require('../../../module/distance.js').calculateDistance;
const jwt = require('../../../module/jwt.js');
const async = require('async');
const pool = require('../../../config/dbPool.js');
const pool_async = require('../../../config/dbPool_async.js');
const secretKey = require('../../../config/secretKey.js').secret;

router.get('/', (req, res) => {
	let product = []; // 전달 할 상품 정보 배열

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	let identify_data = {}; // user, supplier 식별 후 담을 데이터
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
				getIdentifiedDataQuery = "SELECT user_idx, user_addr, user_addr_lat, user_addr_long, user_email, user_phone FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT sup_idx, sup_addr, sup_addr_lat, sup_addr_long, sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
			
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
					// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data.idx = result[0].user_idx;
					identify_data.addr = result[0].user_addr;
					identify_data.addr_lat = result[0].user_addr_lat;
					identify_data.addr_long = result[0].user_addr_long;

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
					// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data.idx = result[0].sup_idx;
					identify_data.addr = result[0].sup_addr;
					identify_data.addr_lat = result[0].sup_addr_lat;
					identify_data.addr_long = result[0].sup_addr_long;

				}

					callback(null);

				}
				connection.release();
			});
		},
		// 3. 공급자가 올린 상품을 가져온다. (판매 중, 판매완료, 타임세일 상관없이 다 가져옴)
		function(callback){
			let getSaleProductQuery = "SELECT pro_idx, pro_name, pro_ex_date, pro_regist_date, pro_info FROM product WHERE mar_idx IN (SELECT mar_idx FROM supplier WHERE sup_idx = ?)";

			(async function(){
				let connections = await pool_async.getConnection();
				let result = await pool_async.query(getSaleProductQuery, identify_data.idx);
				
				for(let i = 0 ; i < result[0].length ; i++){
					let item = result[0];
					product[i] = {};
					product[i].pro_idx = item[i].pro_idx;
					product[i].pro_name = item[i].pro_name;
					product[i].pro_ex_date = item[i].pro_ex_date;
					product[i].pro_regist_date = item[i].pro_regist_date;
					product[i].pro_info = item[i].pro_info;
					product[i].pro_img = null;
				}

				connections.release();
				callback(null);
			})();
		},
		// 3. 상품 이미지 가져오기
		function(callback){
				let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			(async function(){
				let connections = await pool_async.getConnection();

				for(let i = 0 ; i < product.length ; i++){
					let result = await pool_async.query(getProductImageQuery, product[i].pro_idx);
					if(result[0].length != 0){
						let img = result[0]
						product[i].pro_img = img[0].pro_img;
					}
				}

				connections.release();
				callback(null, "Success to get data");
			})();
		}
		];

    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {
			res.status(200).send({
				message : "Success to get data",
				data : product
			});
			console.log(result);
		}
	});			

});


module.exports = router;
