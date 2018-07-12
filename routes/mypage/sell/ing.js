const express = require('express');
const router = express.Router();
const jwt = require('../../../module/jwt.js');
const async = require('async');
const pool = require('../../../config/dbPool.js');
const pool_async = require('../../../config/dbPool_async.js');
const secretKey = require('../../../config/secretKey.js').secret;
const moment = require('moment');
const upload = require('../../../config/s3multer.js');
const identifier = require('../../../module/token_identifier.js');

router.get('/', (req, res) => {
	let saleProduct_info = [];
	let product = {};
	let product_image = [];

	let token = req.headers.token;

	let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
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
				return ;
				console.log(err);
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
		// 3. token 값이 옳으면, pro_idx를 가져온다.
		function(connection, identify_data, callback){
			let getSupIdxQuery = "SELECT pro_idx FROM sell_list WHERE sup_idx = ?";
			connection.query(getSupIdxQuery, [identify_data.idx], function(err, result){
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
				let connection = await pool_async.getConnection();

				for(let i = 0 ; i < pro_idx.length ; i++){
					let value = pro_idx[i];
					let result = await connection.query(getProductDataQuery, value.pro_idx);
					let data = result[0];

					if(result === undefined){
						res.status(500).send({
							message : "Internal Server Error"
						});
						connection.release();
						callback("connection.query Error : " + err);
					}

					if(data.length != 0){
						product = {};
						product.pro_idx = data[0].pro_idx;
						product.pro_name = data[0].pro_name;
						product.pro_price = data[0].pro_price;
						product.pro_sale_price = data[0].pro_sale_price;
						product.pro_info = data[0].pro_info;
						saleProduct_info[i] = {};
						saleProduct_info[i].product = product;
					}
				}
				callback(null, pro_idx);
				connection.release();
			})();
		},
		// 5. 상품 image 가져오기
		function(pro_idx, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";


			(async function(){
				let connection = await pool_async.getConnection();

				for(let i = 0 ; i < saleProduct_info.length ; i++){
					let value = saleProduct_info[i];
					let result = await pool_async.query(getProductImageQuery, value.product.pro_idx);
					let data = result[i];
					//console.log("i : "+ i + " " +result[i]);
					if(result === undefined){
						res.status(500).send({
							message : "Internal Server Error"
						});
						connection.release();
						callback("connection.query Error : " + err);
					}

					if(data){
						product_image = [];
						for(let j = 0 ; j < data.length ; j++){
							product_image[j] = data[j].pro_img;
						}
						saleProduct_info[i].product.pro_img = product_image.slice(0);
					}
				}
				callback(null, "Success to Get Data");
				connection.release();
			})();

		}
	];

	async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
						message : "Success to Get Data",
						data : saleProduct_info
					});
				console.log(result);
			}
		});
});

router.delete('/', (req, res) => {
	let pro_idx = req.body.pro_idx;

	let token = req.headers.token;

	let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
			return new Promise((resolve, reject)=>{
				identifier(token, function(err, result){
					if(err) reject(err);
					else resolve(result);
				});
			}).then(function(identify_data){
				callback(null);
			}).catch(function(err){
				res.status(500).send({
					message : err
				});
				return ;
				console.log(err);
			});
		},
		// 2 pool에서 connection 하나 가져오기
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

	let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
			return new Promise((resolve, reject)=>{
				identifier(token, function(err, result){
					if(err) reject(err);
					else resolve(result);
				});
			}).then(function(identify_data){
				callback(null);
			}).catch(function(err){
				res.status(500).send({
					message : err
				});
				return ;
				console.log(err);
			});
		},
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
		// 2. 팔린 상품으로 이동
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
            message: "Success to Modify Data"
          });
          callback(null, "Success to Modify Data");
        }
        connection.release(); // connection 반환
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
module.exports = router;
