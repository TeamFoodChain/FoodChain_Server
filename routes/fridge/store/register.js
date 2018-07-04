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
const upload = require('../../../config/s3multer.js');

router.get('/', (req, res, next) => {
	res.render('index', { title: 'fridge/store/register'});
	console.log(req.url);
});

// 최대 이미지 개수 미설정
router.post('/', upload.array('image'), (req, res) => {
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



	let pro_name = req.body.pro_name;
	let pro_cate = req.body.pro_cate;
	let pro_ex_date = req.body.pro_ex_date;
	let pro_info = req.body.pro_info;
	let pro_price = req.body.pro_price;
	let pro_sale_price = req.body.pro_sale_price;
	let pro_origin = req.body.pro_origin;
	let mar_idx = req.body.mar_idx;
	let pro_image = [];

	let pro_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");

	if(req.files){
		// req.file에서 이미지 가져와서 key 값( s3 상에 저장되는 file name, config/s3multer에서 설정해 준것)을 저장
		for(let i = 0 ; i < req.files.length ; i++){
			pro_image[i] = req.files[i].location;
		}
	}	

	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	if(!pro_name || !pro_cate || !pro_ex_date || !pro_price || !pro_sale_price || !pro_origin){
		res.status(400).send({
			message : "Null Value"
		});
	}

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
		// 3. token 값이 옳으면, 상품을 등록한다. 등록 후, 등록 한 상품의 index값을 가져온다.
		function(connection, callback){
			let getProductIdxQuery = "SELECT pro_idx FROM product WHERE pro_cate = ? AND pro_name = ? AND pro_price = ? AND pro_sale_price = ? AND pro_ex_date = ? AND pro_regist_date = ? AND pro_info = ? AND mar_idx = ? AND pro_origin = ?";
			let insertProductQuery = "INSERT INTO product (pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
			connection.query(insertProductQuery, [pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else {
					// res.status(200).send({
					// 	message : "Success to register product"
					// });
				}
			});

			connection.query(getProductIdxQuery, [pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else {
					callback(null, connection, result[0]);
				}
			});
		},

		// 4. image는 테이블이 따로 있으므로 3에서 구한 pro_idx값을 이용해서 따로 저장해 준다.

		function(connection, result, callback){
			let insertProductImageQuery = "INSERT INTO product_image (pro_idx, pro_img) VALUES(?, ?)";

			for(let i = 0 ; i < pro_image.length ; i++){
				connection.query(insertProductImageQuery, [result.pro_idx, pro_image[i]], function(err, result){
					if(err) {
						callback("connection.query Error : " + err);
					}
				});
			}

			res.status(200).send({
				message : "Success to register product"
			});
			callback(null, "Success to register product");
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
