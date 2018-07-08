const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;


router.get('/', (req, res) => {

	let saleProduct_info = [];
	let product = {};
	let product_image = [];
	let identify_data = {}; // user, supplier 식별 후 담을 데이터


	let mar_idx =  [];
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
							mar_idx.push(result[i].mar_idx);
						}
					}
					callback(null);
					connection.release();
				}
			});
		},

		// 4. 마켓 index를 가지고 product search, 등록 순
		function(callback){
			let getProductDataQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_issell = 0 AND pro_istimesale = 1 ORDER BY pro_regist_date DESC";
			let cnt = 0; // null인 값을 피하기 위해 cnt로 count한다.
			console.log(mar_idx);
			(async function(){
				let connections = await pool_async.getConnection();

				let reserve = function(cb){
					process.nextTick(function(){
						cb(mar_idx);
					});
				}

				let makeReserve = function(i, mar_idx){
					reserve(async function(mar_idx){
						let result = await pool_async.query(getProductDataQuery, mar_idx[i]);
						let data = result[0];
						console.log(data);
						return new Promise((resolve, reject)=>{
							resolve();
							if(data.length!=0){
							product = {};
							product.pro_idx = data[0].pro_idx;
							product.pro_name = data[0].pro_name;
							product.pro_price = data[0].pro_price;
							product.pro_sale_price = data[0].pro_sale_price;
							product.pro_ex_date = data[0].pro_ex_date;
							product.pro_regist_date = data[0].pro_regist_date;
							product.pro_info = data[0].pro_info;
							product.pro_img = [];
							product.mar_idx = mar_idx[i];
							saleProduct_info[cnt] = {};
							saleProduct_info[cnt].product = product;
							cnt++;
						}
						}).then(function(){
							if(i + 1 == mar_idx.length){
								//end();
								console.log("end");
								callback(null);
								connections.release();
								//console.log(saleProduct_info);
							}

						});
						

							
					
				});
				}
				// pro_idx 가 없으면 (상품이 없을 경우) 다음 단계 진행
				if(mar_idx.length == 0){
					callback(null);
					return; ///////////////////////////fdsfsdfsd
				}
				
				for(var i = 0 ; i < mar_idx.length && i <20 ; i++){ // 최대 상품 개수 20개
					makeReserve(i, mar_idx);
				}

				let end = function(){
					callback(null);
				}
			})();
		},

		// 5. 상품 image 가져오기
		function(callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

				(async function(){
				let connections = await pool_async.getConnection();

				let reserve = function(cb){
					process.nextTick(function(){
						cb(saleProduct_info);
					});
				}

				let makeReserve = function(i, pro_idx){
					reserve(async function(pro_idx){
						let value = pro_idx[i];
						let result = await pool_async.query(getProductImageQuery, pro_idx[i].product.pro_idx);
						let data = result[0];
						if(data.length != 0){
							product_image = [];
							for(let j = 0 ; j < data.length ; j++){
								product_image[j] = data[j].pro_img;
							}
							saleProduct_info[i].product.pro_img = product_image.slice(0);
						}

						if(i + 1 == pro_idx.length){
						end();
						
					}
				});
				}
				//pro_idx가 없을 경우(상품이 없을 경우) 다음 단계 진행 (끝)
				if(saleProduct_info.length == 0){
					callback(null, "no data");
					connections.release();
				}

				for(var i = 0 ; i < saleProduct_info.length ; i++){
					makeReserve(i, saleProduct_info);
				}

				let end = function(){
					callback(null, "Success to load");
					connections.release();
				}
			})();
		}
		];


    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {
			res.status(200).send({
				message : "Success to get data",
				data : saleProduct_info
			});
			console.log(result);
		}
	});	
});


module.exports = router;
