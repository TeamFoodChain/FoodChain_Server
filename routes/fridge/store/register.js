/*
	이슈
	1. 상품을 등록 후, 바로 index 값을 가져올 때, 등록 할 때 쓴 정보들로 비교를 하여 index를 가져온다. 유일성을 위해서 시간을 초단위 까지 나눠서 저장 했지만
	   이것 또한 동시에 등록해서 겹쳐버리면 어떻게 할 것 인가?
	2. post req를 받자마자 이미지를 등록해 버린다. 이미지를 등록하고, db를 입력하기 전에 error가 발생하면 그 이미지는 쓸모없는 이미지가 되는데 어떻게 할 것인가?

*/

const express = require('express');
const router = express.Router();
const jwt = require('../../../module/jwt.js');
const async = require('async');
const pool = require('../../../config/dbPool.js');
const pool_async = require('../../../config/dbPool_async.js');
const secretKey = require('../../../config/secretKey.js').secret;
const moment = require('moment');
const s3 = require('../../../config/s3multer.js');
const identifier = require('../../../module/token_identifier.js');
const multer = require('multer');
const upload = multer();

router.get('/', (req, res) => {

});

// 최대 이미지 개수 미설정
router.post('/', upload.array('pro_img'), (req, res) => {
	let token = req.headers.token;

	let mar_idx;

	let pro_idx = req.body.pro_idx;

	let pro_name = req.body.pro_name;
	let pro_cate = req.body.pro_cate;
	let pro_ex_date = req.body.pro_ex_date;
	let pro_info = req.body.pro_info;
	let pro_price = req.body.pro_price;
	let pro_sale_price = req.body.pro_sale_price;
	let pro_origin = req.body.pro_origin;
	let pro_istimesale = req.body.pro_istimesale;
	let pro_deadline_start = req.body.pro_deadline_start;
	let pro_deadline_end = req.body.pro_deadline_end;
	let pro_image = [];

	let pro_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");


	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	if(!pro_name || !pro_cate || !pro_ex_date || !pro_price || !pro_sale_price || !pro_origin || !pro_istimesale){
		res.status(400).send({
			message : "Null Value"
		});
		return ;
	}

	if(!pro_idx){


	let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
			return new Promise((resolve, reject)=>{
				identifier(token, function(err, result){
					if(err) reject(err);
					else resolve(result);
				});
			}).then(function(identify_data){
				if(identify_data.identify == 0){
					console.log("Access Denied");
					res.status(400).send({
						message : "Access Denied"
					});
					callback("Access Denied");
					return;
				}
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
		// 3. mar_idx 값 가져오기
		function(connection, identify_data, callback){
			let getMar_idxQuery = "SELECT mar_idx FROM supplier WHERE sup_idx = ?";
			connection.query(getMar_idxQuery, identify_data.idx, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				} else {
					mar_idx = result[0].mar_idx;
					callback(null, connection, identify_data);
				}
			});
		},
		// 4. s3에 이미지 등록
		function(connection, identify_data, callback){
			console.log(req.files)
			if(req.files.length != 0){ // 이미지 db, s3에 저장
				console.log(req.files);
			// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
				for(let i = 0 ; i < req.files.length ; i++){
					pro_image[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + req.files[i].originalname.split('.').pop();
					//s3.upload(req.files[i]);
				}
				(async function(){
					let result = await s3.upload(req.files);
					console.log(result);
						callback(null, connection, identify_data);
				})();
			} else {
				res.status(400).send({
					message : "No Image"
				});
				connection.release();
				callback("No Image");
				return;
			}
		},
		// 5. token 값이 옳으면, 상품을 등록한다. 등록 후, 등록 한 상품의 index값을 가져온다.
		function(connection, identify_data, callback){
			let insertProductQuery = "INSERT INTO product (pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin, pro_istimesale, pro_deadline_start, pro_deadline_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			connection.query(insertProductQuery, [pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx,  pro_origin, pro_istimesale, pro_deadline_start, pro_deadline_end], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				} else {
					callback(null, connection, identify_data);
				}
			});
		},
		// 6. 방금 추가한 상품의 index값 얻어오기
		function(connection, identify_data, callback){
			let getProductIdxQuery = "SELECT LAST_INSERT_ID() as pro_idx";
			connection.query(getProductIdxQuery, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				} else {
					callback(null, connection,identify_data, result[0]);
				}
			});
		},


		// 7. image는 테이블이 따로 있으므로 3에서 구한 pro_idx값을 이용해서 따로 저장해 준다.
		function(connection, identify_data, result, callback){
			let insertProductImageQuery = "INSERT INTO product_image (pro_idx, pro_img) VALUES(?, ?)";
			for(let i = 0 ; i < pro_image.length ; i++){
				connection.query(insertProductImageQuery, [result.pro_idx, pro_image[i]], function(err, result){
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
						connection.release();
					} 
				});

			}
			callback(null, connection, identify_data, result);
		},
		// 8. sell_list에 추가해 준다.
		function(connection, identify_data, result, callback){
			let insertSell_ListImageQuery = "INSERT INTO sell_list (sup_idx, pro_idx) VALUES(?, ?)";
			connection.query(insertSell_ListImageQuery, [identify_data.idx, result.pro_idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				}  else{
					callback(null, "Success to Upload Data");
				connection.release();
				}
			});
		}
		];
		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
					message : "Success to Upload Data"
				});
				console.log(result);
			}
		});


	} else{ //pro_idx가 있을 때 (상품을 수정)
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
			// 2. pool에서 connection 하나 가져오기
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

			// 3. 수정사항 등록
			function(connection, callback){
				let UpdateProductQuery = "UPDATE product SET pro_name = ?, pro_cate = ?, pro_ex_date = ?, pro_regist_date = ?, pro_info = ? , pro_price = ?, pro_sale_price = ?, pro_origin = ?, pro_istimesale = ?, pro_deadline_start = ?, pro_deadline_end = ? WHERE pro_idx = ?";

				connection.query(UpdateProductQuery, [pro_name, pro_cate, pro_ex_date, pro_regist_date, pro_info, pro_price, pro_sale_price, pro_origin, pro_istimesale, pro_deadline_start, pro_deadline_end, pro_idx], function(err, result){
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
						connection.release();
					} else if(result.affectedRows == 0){
						res.status(400).send({
							message : "Invalid Index"
						});
						callback("Invalid Index");
						connection.release();
						return;
					} else{
						callback(null, connection);
					}
				});
			},
			// 3. product image 가져오기
			function(connection, callback){
				let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";		

				connection.query(getProductImageQuery, pro_idx, function(err, result){
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
						connection.release();
					}		

					if(result.length != 0){
						for(let i = 0 ; i < result.length ; i++){
							pro_image[i] = {};
							pro_image[i].Key = result[i].pro_img.substring(55, result[i].pro_img.length);
						}
						console.log(pro_image);
					}
					callback(null, connection);
				});
			},
			// 4. DB에서 image 삭제
			function(connection, callback){
				let DeletePorductImageQuery = "DELETE FROM product_image WHERE pro_idx = ?";

				connection.query(DeletePorductImageQuery, pro_idx, function(err, result){
					if(err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
						connection.release();
					} else {
						callback(null, connection);
					}
				});
			},

			// 5. s3에서 이미지 삭제
			function(connection, callback){
				if(pro_image.length == 0){
				} else{
					s3.delete(pro_image);
				}
					callback(null, connection);
				},

			// 6. s3에 새로운 이미지 등록
			function(connection, callback){
				if(req.files){ // 이미지 db, s3에 저장
					// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
					for(let i = 0 ; i < req.files.length ; i++){
						pro_image[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + req.files[i].originalname.split('.').pop();
						s3.upload(req.files[i]);
					}
				}
				callback(null, connection);
			},
			// 7. DB에 새로운 이미지를 등록
			function(connection, callback){
			let insertProductImageQuery = "INSERT INTO product_image (pro_idx, pro_img) VALUES(?, ?)";
			(async function(){
				let connections = await pool_async.getConnection();
				for(let i = 0 ; i < pro_image.length ; i++){
					let result = connections.query(insertProductImageQuery, [pro_idx, pro_image[i]]);
					if(!result){
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("connection.query Error : " + err);
						connections.release();
						return;
					}

				}

				callback(null, "Success to Modify Data");
				connection.release();

			})();
			}
			];
		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
					message : "Success to Modify Data"
				});
				console.log(result);
			}
		});			
	}

	});

router.delete('/', (req, res) => {
	let token = req.headers.token;

	let pro_idx = req.body.pro_idx;
	let pro_images = []; // 삭제 할 product image를 담는 배열

	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	console.log(pro_idx);
	if(!pro_idx){
		res.status(200).send({
			message : "Null Value"
		});
		return ;
	}

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
		// 2. pool에서 connection 하나 가져오기
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
		// 3. product image 가져오기
		function(connection, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			connection.query(getProductImageQuery, pro_idx, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				}

				if(result.length != 0){
					for(let i = 0 ; i < result.length ; i++){
						pro_images[i] = {};
						pro_images[i].Key = result[i].pro_img.substring(55, result[i].pro_img.length);
					}
					console.log(pro_images);
				}
				callback(null, connection);
			});
		},
		// 4. product table에서 row삭제, 참조된 테이블의 row도 같이 삭제
		function(connection, callback){
			let deleteProductQuery = "DELETE FROM product WHERE pro_idx = ?";

			connection.query(deleteProductQuery, pro_idx, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
					connection.release();
				}
				if(result.length == 0){
					callback("No Data");
					connection.release();
				} else {
					callback(null);
					connection.release();
				}
			});
		},
		// 5. s3 상에서도 image 삭제
		function(callback){
			if(pro_images.length == 0){
			} else{
				s3.delete(pro_images);
			}
				callback(null, "Success to Delete Data");
		}
		];

	async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
					message : "Success to Delete Data"
				});
				console.log(result);
			}
		});

});
module.exports = router;
