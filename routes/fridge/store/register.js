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

router.get('/', (req, res, next) => {
	let a = jwt.sign("leesd556@gmail.com", "01021121891", 0);
	console.log(a);
	res.render('index', { title: 'fridge/store/register'});
	console.log(req.url);
});

// 최대 이미지 개수 미설정
router.post('/', s3.upload.array('image'), (req, res) => {
	let token = req.headers.token;

	let pro_name = req.body.pro_name;
	let pro_cate = req.body.pro_cate;
	let pro_ex_date = req.body.pro_ex_date;
	let pro_info = req.body.pro_info;
	let pro_price = req.body.pro_price;
	let pro_sale_price = req.body.pro_sale_price;
	let pro_origin = req.body.pro_origin;
	let pro_istimesale = req.body.pro_istimesale;
	let pro_deadline = req.body.pro_deadline;
	let pro_image = [];

	let pro_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");

	if(req.files){
		// req.file에서 이미지 가져와서 key 값( s3 상에 저장되는 file name, config/s3multer에서 설정해 준것)을 저장
		for(let i = 0 ; i < req.files.length ; i++){
			pro_image[i] = req.files[i].location;
		}
	}	

	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	if(!pro_name || !pro_cate || !pro_ex_date || !pro_price || !pro_sale_price || !pro_origin || !pro_istimesale || !pro_deadline){
		res.status(400).send({
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
		// 3. token 값이 옳으면, 상품을 등록한다. 등록 후, 등록 한 상품의 index값을 가져온다.
		function(connection, identify_data, callback){
			let insertProductQuery = "INSERT INTO product (pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin, pro_istimesale, pro_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			connection.query(insertProductQuery, [pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, 1, pro_origin, pro_istimesale, pro_deadline], function(err, result){
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
		// 4. 방금 추가한 상품의 index값 얻어오기
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


		// 5. image는 테이블이 따로 있으므로 3에서 구한 pro_idx값을 이용해서 따로 저장해 준다.
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
		// 6. sell_list에 추가해 준다.
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
					res.status(200).send({
						message : "Success to register product"
					});
					callback(null, "Success to register product");
				connection.release();
				}
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
