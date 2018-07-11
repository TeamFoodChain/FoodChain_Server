const express = require('express');
const router = express.Router();
const async = require('async');
const upload = require('../../config/s3multer.js');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const jwt = require('../../module/jwt.js');
const identifier = require('../../module/token_identifier.js');

router.get('/', (req, res) => {
	let bookmark_info = [];
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
		// 3.해당 토큰의 idx를 가져와서 북마크한 상품이 뭔지 파악한다.
		function(connection, identify_data, callback){
			// user or sup index를 사용하여 product index를 가져온다.
			let getSupBookmarkIdxQuery = "SELECT pro_idx FROM bookmark WHERE sup_idx = ? OR user_idx = ?";
			connection.query(getSupBookmarkIdxQuery, [identify_data._idx, identify_data._idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				}
				if(result.length == 0){
					res.status(500).send({
						message : "No data"
					});
					callback("No data");
					return;
				}
				callback(null, result);
				connection.release(); 
			});
		},
		// 4. 받아온 pro_idx로 북마크 정보를 조회한다.
		function(pro_idx, callback){
			let getBookmarkProductQuery = "SELECT * FROM product NATURAL JOIN market WHERE pro_idx = ?";

			(async function(){
				let connection = await pool_async.getConnection();

				for(let i = 0 ; i < pro_idx.length ; i++){
					let value = pro_idx[i];
					let result = await pool_async.query(getBookmarkProductQuery, value.pro_idx);
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
						bookmark_info[i] = {};
						bookmark_info[i].product = product;
					} 
				}

				callback(null, pro_idx);
				connection.release();
			})();
		},

		function(pro_idx, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			(async function(){
				let connection = await pool_async.getConnection();

				for(let i = 0 ; i < bookmark_info.length ; i++){
					let value = bookmark_info[i];
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
						bookmark_info[i].product.pro_img = product_image.slice(0);
					}
				}
				callback(null, "Success to load");
				connection.release();
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
