const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const secretKey = require('../../config/secretKey.js').secret;
const identifier = require('../../module/token_identifier.js');

router.get('/', (req, res) => {
	let markets = []; // 반경 이내에 있는 마켓들 
	let nearData = {};  // 클라로 넘겨 줄 데이터
	let markets_locate = {}; // markets에 넣을 객체

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

		// 3. 주변 마켓 정보 검색 쿼리 다시 생각할 것
		function(connection, identify_data, callback){
			let getMarketQuery = "SELECT * FROM market";
			connection.query(getMarketQuery, function(err, result){
				if(result.length == 0){ 
					connection.release();
					callback("No Data");
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
						if((Math.abs(identify_data.addr_lat - result[i].mar_locate_lat)<= 0.009 && Math.abs(identify_data.addr_long - result[i].mar_locate_long) <=0.0114)){
							markets_locate ={};
							markets_locate.mar_idx = result[i].mar_idx;
							markets_locate.mar_addr = result[i].mar_addr;
							markets_locate.mar_locate_lat = result[i].mar_locate_lat;
							markets_locate.mar_locate_long = result[i].mar_locate_long;
							//markets_locate로 json 객체 만들어 주고
							markets.push(markets_locate); //배열에 넣는다
						}
					}
					nearData.addr = identify_data.addr;
					nearData.addr_lat = identify_data.addr_lat;
					nearData.addr_long = identify_data.addr_long;
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
						message : "Success to GET",
						data : nearData
					});
				console.log(result);
			}
		});

});


module.exports = router;
