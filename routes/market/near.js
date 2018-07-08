const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const secretKey = require('../../config/secretKey.js').secret;

router.get('/', (req, res) => {
	let markets = []; // 반경 이내에 있는 마켓들 
	let nearData = {};  // 클라로 넘겨 줄 데이터
	let markets_locate = {}; // markets에 넣을 객체
	let identify_data = {}; // user, supplier 식별 후 담을 데이터

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
					// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
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
					identify_data.addr = result[0].sup_addr;
					identify_data.addr_lat = result[0].sup_addr_lat;
					identify_data.addr_long = result[0].sup_addr_long;
				}

					callback(null, connection, identify_data);
				}
			});
		},

		// 3. 주변 마켓 정보 검색 쿼리 다시 생각할 것
		function(connection, data, callback){
			let getMarketQuery = "SELECT * FROM market";
			connection.query(getMarketQuery, function(err, result){
				if(result.length == 0){ // 해당 토큰이 없다 
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
					for(let i = 0 ; i < result.length ; i++){
						if((Math.abs(data.addr_lat - result[i].mar_locate_lat)<= 0.009 && Math.abs(data.addr_long - result[i].mar_locate_long) <=0.0114)){
							markets_locate.mar_idx = result[i].mar_idx;
							markets_locate.mar_addr = result[i].mar_addr;
							markets_locate.mar_locate_lat = result[i].mar_locate_lat;
							markets_locate.mar_locate_long = result[i].mar_locate_long;
							//markets_locate로 json 객체 만들어 주고
							markets.push(markets_locate); //배열에 넣는다
						}
					}
					nearData.addr = data.addr;
					nearData.addr_lat = data.addr_lat;
					nearData.addr_long = data.addr_long;
					nearData.markets = markets;
					//user or sup data도 넣기
					callback(null, "Success to GET");
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
						message : "Success to load",
						data : nearData
					});
				console.log(result);
			}
		});

});


module.exports = router;
