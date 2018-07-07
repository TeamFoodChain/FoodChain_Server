const express = require('express');
const router = express.Router();
const distance = require('../../module/distance.js').calculateDistance;
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;


router.get('/', (req, res) => {
	let pro_idx = req.query.pro_idx;
	let pro_cate = req.query.pro_cate;

	let saleProduct_info = [];
	let product = {};
	let product_image = [];

	let identify_data = {}; // user, supplier 식별 후 담을 데이터
	let market = []; // 반경 내의 마켓 정보
	let mar_idx_distance = []; // market을 이용해 반경 내에서 거리순으로 재배열

    let token = req.headers.token;
	let decoded = jwt.verify(token);

	// token verify
	if (decoded == -1) {
		res.status(500).send({
			message : "token err"
		});
	}

	let email = decoded.email;
	let phone = decoded.phone;
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

					callback(null, connection);
				}
			});
		},
		// 3. 주변 마켓 정보 검색 쿼리 다시 생각할 것
		function(connection, callback){
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
						if((Math.abs(identify_data.addr_lat - result[i].mar_locate_lat)<= 0.009 && Math.abs(identify_data.addr_long - result[i].mar_locate_long) <=0.0114)){
							market.push(result[i]);
						}
					}
					callback(null, connection);
				}
			});
		},

		// 4. 반경(2km)안에 있는 market의 idx를 가지고, 거리 순으로 mar_idx를 정렬
		function(connection, callback){ // data : identify_data
			if(market.length == 0){ // 주변 마켓이 아무것도 없을 때 예외처리

			}
			for(let i = 0 ; i < market.length ; i++){
				mar_idx_distance.push([market[i].mar_idx, distance(identify_data.addr_lat, identify_data.addr_long, market[i].mar_locate_lat, market[i].mar_locate_long)]);
			}

			mar_idx_distance.sort(function(a, b){ // 오름차순 (거리순) 정렬
				if(a[1] === b[1]){
					return 0;
				} else{
					return a[1]-b[1];
				}
			});
			//console.log(mar_idx_distance);

			callback(null, connection);
		}, 
		// 4. 반경 안에 있는, 거리 순으로 정렬된 마켓에 있는 상품들을 가져온다.
		function(connection, callback){
			let dd = [];
			let getProuctFromMarketQuery = "SELECT * FROM product WHERE mar_idx = ?";
			let cnt = 0;
			(async function(){
				let connections = await pool_async.getConnection();

				let reserve = function(cb){
					process.nextTick(function(){
						cb(mar_idx_distance);
						console.log("3");
					});
				}

				let makeReserve = function(i, mar_idx_distance){
					reserve(async function(mar_idx_distance){
						console.log("2");
						console.log("i :" + i);
						let result = await pool_async.query(getProuctFromMarketQuery, mar_idx_distance[i][0]); //[][0] : mar_idx, [][1] : distance
						dd.push(result[0]);
						console.log("result i :" + result[0]);
						let data = result[0];


						return new Promise((resolve, reject) => { // await를 썻지만 결국 비동기기 때문에 제어하기 위해 promise를 씀
							resolve();
							if(result === undefined){
							res.status(500).send({
								message : "Internal Server Error"
							});
							connection.release();
							callback("connection.query Error : " + err);
						}
						//console.log("length : " ,data.length);
						//console.log("data : ", data);
						if(data.length != 0){
							data.forEach(function(v, j){
								console.log("foreach : " + j);
								//console.log("sdsdsd : ", v);
								product = {};
								product.pro_idx = v.pro_idx;
								product.pro_name = v.pro_name;
								product.pro_price = v.pro_price;
								product.pro_sale_price = v.pro_sale_price;
								product.pro_ex_date = v.pro_ex_date;
								product.pro_regist_date = v.pro_regist_date;
								product.pro_info = v.pro_info;
								product.mar_idx = mar_idx_distance[i][0];
								product.pro_img = [];
								product.dist = mar_idx_distance[i][1];
								saleProduct_info[cnt] = {};
								saleProduct_info[cnt].product = product;
								//console.log(saleProduct_info[cnt]);
								cnt++;
							});
						}
						}).then(function(){
							if(i + 1 == mar_idx_distance.length){
							//console.log(dd);
							console.log("end");
							end();
					}
						});
						
					

				});

				}
				
				for(var i = 0 ; i < mar_idx_distance.length ; i++){ 
					makeReserve(i, mar_idx_distance);
					console.log("1");
				}

				let end = function(){
					callback(null);
					connections.release();
				}
			})();
		},

		// 5. 상품 이미지를 가져온다.
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

						return new Promise((resolve, reject)=>{
							resolve();
							if(data.length != 0){
							product_image = [];
							for(let j = 0 ; j < data.length ; j++){
								product_image[j] = data[j].pro_img;
							}
							console.log("dddd : "+ product_image); // 여기가 callback 되고 나서, res.status가 찍히고 나서도 실행이 된다. 왜그럴까?
							saleProduct_info[i].product.pro_img = product_image.slice(0);
						}
						}).then(function(){
							if(i + 1 == pro_idx.length){
							saleProduct_info.sort(function(a, b){
								console.log(a.product.dist);
								if(a.product.dist === b.product.dist){
									return 0;
								} else {
									return a.dist - b.dist;
								}
							});
						end();
					}
						});
						

						
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


    async.waterfall(taskArray, async function(err, result){
		if(err){
			console.log(err);
		} else {
			console.log("res");
			res.status(200).send({
				message : "success",
				saleProduct_info : saleProduct_info
			});
			//console.log(result);
		}
	});	

});


module.exports = router;
