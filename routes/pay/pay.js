const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const secretKey = require('../../config/secretKey.js').secret;

router.get('/', (req, res) => {
    res.render('index', { title: 'pay' });
});

router.post('/', (req, res) => {
	let pro_idx = req.body.pro_idx;
	let idx; //user 또는 supplier의 idx
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
				getIdentifiedDataQuery = "SELECT user_idx, user_email, user_phone FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT sup_idx, sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
			
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
						idx = result[0].user_idx;
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
						idx = result[0].supplier_idx;
					} else {
						res.status(400).send({
							message : "Invalid token error"
						});
						connection.release();
						callback("Invalid token error");
						return;
					}

				}

					callback(null, connection);
				}
			});
		},

		// 3. shop_list를 확인해서 이미 등록 한 물건인지 확인한다 (보안차원..?)

		function(connection, callback){
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
							message : "Already saled!"
						});
						callback("Already saled!");
						connection.release();
					} else{
						callback(null, connection);
					}
				}
			});
		},

		// 3. 구매 상품을 shop_list에 등록, product의 issell을 1로 변경
		function(connection, callback){
			let registerShop_listQuery = "";
			let updateProductIssellQuery = "UPDATE product SET pro_issell = 1 WHERE pro_idx = ?";

			if(identify == 0){
				registerShop_listQuery = "INSERT INTO shop_list(user_idx, pro_idx) VALUES (?, ?)";
			} else{
				registerShop_listQuery = "INSERT INTO shop_list(sup_idx, pro_idx) VALUES (?, ?)";
			}

			connection.query(registerShop_listQuery, [idx, pro_idx], function(err, result){
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
					message : "Success to buy product"
				});
				console.log(result);
			}
		});


});

module.exports = router;
