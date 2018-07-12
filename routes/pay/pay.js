const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const secretKey = require('../../config/secretKey.js').secret;
const identifier = require('../../module/token_identifier.js');

router.get('/', (req, res) => {
    res.render('index', { title: 'pay' });
});

router.post('/', (req, res) => {
	let pro_idx = req.body.pro_idx;
	let idx; //user 또는 supplier의 idx

	let token = req.headers.token;
	let decoded = jwt.verify(token);

	let identify = decoded.identify;
	
	let taskArray = [
		// 0. body 값 확인
		function(callback){
			if(!pro_idx){
				res.status(400).send({
					message : "Null Value"
				});
				callback("Null Value");
			}
			else{
				callback(null);
			}
		},
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

		// 3. shop_list를 확인해서 이미 등록 한 물건인지 확인한다 (보안차원..?)
		function(connection, identify_data, callback){
			let checkShop_listQuery = "SELECT * FROM shop_list WHERE pro_idx = ?";

			connection.query(checkShop_listQuery, pro_idx, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else{
					if(result.length != 0){ // 반환 값의 길이가 0 일때 (테이블이 비어서 반환 값이 null일 때)
						res.status(500).send({
							message : "Already Saled"
						});
						callback("Already Saled");
						connection.release();
					} else{
						callback(null, connection, identify_data);
					}
				}
			});
		},

		// 3. 구매 상품을 shop_list에 등록, product의 issell을 1로 변경
		function(connection, identify_data, callback){
			let registerShop_listQuery = "";
			let updateProductIssellQuery = "UPDATE product SET pro_issell = 1 WHERE pro_idx = ?";

			if(identify == 0){
				registerShop_listQuery = "INSERT INTO shop_list(user_idx, pro_idx) VALUES (?, ?)";
			} else{
				registerShop_listQuery = "INSERT INTO shop_list(sup_idx, pro_idx) VALUES (?, ?)";
			}

			connection.query(registerShop_listQuery, [identify_data.idx, pro_idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				}
			});

			connection.query(updateProductIssellQuery, pro_idx, function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else{
					callback(null, "Success to buy product");
				}
				connection.release();
			});
		}
		];

		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
					message : "Success to Buy Product"
				});
				console.log(result);
			}
		});


});

module.exports = router;
