const express = require('express');
const router = express.Router();
const jwt = require('../../../module/jwt.js');
const async = require('async');
const pool = require('../../../config/dbPool.js');
const pool_async = require('../../../config/dbPool_async.js');
const secretKey = require('../../../config/secretKey.js').secret;
const moment = require('moment');
const upload = require('../../../config/s3multer.js');

router.get('/', (req, res) => {
	let saleProduct_info = [];
	let product = {};
	let product_image = [];

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	console.log(decoded);

	// token verify
	if (decoded == -1) {
		res.status(500).send({
			message : "token err"
		});
	}

	let email = decoded.email;
	let phone = decoded.phone;

	let sup_idx;


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
		// 2. token과 비교하기 위해 supplier table에서 sup_idx,email, phone number를 가져옴
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
						sup_idx = result[0].sup_idx;
					} else {
						res.status(400).send({
							message : "Invalid token error"
						});
						connection.release();
						callback("Invalid token error");
					}
					callback(null, connection);
				}
			});
		},
		// 3. token 값이 옳으면, pro_idx를 가져온다.
		function(connection, callback){
			let getSupIdxQuery = "SELECT pro_idx FROM sell_list WHERE sup_idx = ?";
			connection.query(getSupIdxQuery, [sup_idx], function(err, result){
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

		// 4. pro_idx와 sup_idx를 가지고 판매 상품을 가져온다.
		function(pro_idx, callback){
			let getProductDataQuery = "SELECT * FROM product WHERE pro_idx = ?";

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
						let result = await pool_async.query(getProductDataQuery, value.pro_idx);
						let data = result[0];
						product = {};
						product.pro_idx = data[0].pro_idx;
						product.pro_name = data[0].pro_name;
						product.pro_price = data[0].pro_price;
						product.pro_sale_price = data[0].pro_sale_price;
						product.pro_info = data[0].pro_info;
						saleProduct_info[i] = {};
						saleProduct_info[i].product = product;

						if(i + 1 == pro_idx.length){
						end();
						connections.release();
					}
				});
				}
				// pro_idx 가 없으면 (상품이 없을 경우) 다음 단계 진행
				if(pro_idx.length == 0){
					callback(null, pro_idx);
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
						if(data.length != 0){
							product_image = [];
							for(let j = 0 ; j < data.length ; j++){
								product_image[j] = data[j].pro_img;
							}
							saleProduct_info[i].product.pro_img = product_image.slice(0);
						}

						if(i + 1 == pro_idx.length){
						end();
						connections.release();
					}
				});
				}
				//pro_idx가 없을 경우(상품이 없을 경우) 다음 단계 진행 (끝)
				if(pro_idx.length == 0){
					callback(null, pro_idx);
				}

				for(var i = 0 ; i < pro_idx.length ; i++){
					makeReserve(i, pro_idx);
				}

				let end = function(){
					callback(null, "Success to load");
				}
			})();


		}
	];

	async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
						message : "Success to load",
						data : saleProduct_info
					});
				console.log(result);
			}
		});
});

router.delete('/', (req, res) => {
	let pro_idx = req.body.pro_idx;

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	console.log(decoded);

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
		// 2. token과 비교하기 위해 supplier table에서 email, phone number를 가져옴
		function(connection, callback){
			let getUserDataQuery = "SELECT sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
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
					callback(null, connection);
				}
			});
		},

		// 3. 해당 상품 삭제
		function(connection, callback){
			let deleteProductQuery = 'DELETE FROM product WHERE pro_idx = ?';
			connection.query(deleteProductQuery, pro_idx, function(err, result){
				if (err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else {
					if (result.affectedRows === 1) {					// affectedRows 프로퍼티 : 영향을 미친 데이터 Row 수
						res.status(201).send({
							message : "Successful Delete Comment Data"
						});
						callback(null, "Successfully Delete Comment Data");
					} else if (result.affectedRows === 0) {		// 바뀐 row 가 없으면 => 입력을 잘못 받은 것
						res.status(400).send({
							message : "Wrong Input"
						});
						callback("Wrong Input");
					}
				}
				connection.release();
				});
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

router.put('/', (req, res) => {
	let pro_idx = req.body.pro_idx;

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	console.log(decoded);

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
		// 2. token과 비교하기 위해 supplier table에서 email, phone number를 가져옴
		function(connection, callback){
			let getUserDataQuery = "SELECT sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
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
					callback(null, connection);
				}
			});
		},
		function(connection, callback){
			let updateIssellQuery = "UPDATE product SET pro_issell = 1 WHERE pro_idx = ?";

		connection.query(updateIssellQuery, [pro_idx], function(err, result){
			if (err) {
          res.status(500).send({
              message: "Internal Server Error"
          });
          callback("connection.query Error : " + err);
        } else {
          res.status(200).send({
            message: "Success to alter data"
          });
          callback(null, "Success to alter data");
        }
        connection.release(); // connection 반환
		});
	}
	]

		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				console.log(result);
			}
		});
});
module.exports = router;
