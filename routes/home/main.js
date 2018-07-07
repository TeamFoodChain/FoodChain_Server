const express = require('express');
const router = express.Router();
const distance = require('../../module/distance.js').calculateDistance;
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;

//추천 상품, 쿠폰 홍보 배너, 최신상품(동네 위치 기준 20개)
//추천상품, 쿠폰 홍보 배너 아직 보류 구현 남음


router.get('/', (req, res) =>{
	let saleProduct_info = []; // 최신상품들을 담는 배열
	let product = {}; // saleProduct_info에 상품을 담을 객체
	let product_image = []; // 최신상품들의 이미지를 담을 배열

	let identify_data = {}; // user, supplier 식별 후 담을 데이터

	let reco_data = []; // 추천상품을 담을 배열

	let mar_idx =  []; // 사용자 설정 위치 반경 2km 이내의 마켓들의 index
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
				getIdentifiedDataQuery = "SELECT user_idx, user_addr, user_addr_lat, user_addr_long, user_email, user_phone FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT sup_idx, sup_addr, sup_addr_lat, sup_addr_long, sup_email, sup_phone FROM supplier WHERE sup_token = ? ";
			
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
					identify_data.idx = result[0].user_idx;
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
					identify_data.idx = result[0].sup_idx;
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

		// 4. 마켓 index를 가지고 product search, 등록 순 (팔린 상품, timesale 상품 제외)
		function(callback){
			let getProductDataQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_issell = 0 AND pro_istimesale = 0 ORDER BY pro_regist_date DESC";
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
						//console.log(data);
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
							saleProduct_info[cnt] = product;
							cnt++;
						}
						}).then(function(){
							if(i + 1 == mar_idx.length){
								end();
								// console.log("end");
								// callback(null, connections);
								//console.log(saleProduct_info);
							}

						});
						

							
					
				});
				}
				// pro_idx 가 없으면 (상품이 없을 경우) 다음 단계 진행
				if(mar_idx.length == 0){
					callback(null, "No Data");
					connections.release();
					return; ///////////////////////////fdsfsdfsd
				}
				
				for(var i = 0 ; i < mar_idx.length && i <20 ; i++){ // 최대 상품 개수 20개
					makeReserve(i, mar_idx);
				}

				let end = function(){
					callback(null);
					connections.release();
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
						let result = await pool_async.query(getProductImageQuery, pro_idx[i].pro_idx);
						let data = result[0];
						if(data.length != 0){
							product_image = [];
							for(let j = 0 ; j < data.length ; j++){
								product_image[j] = data[j].pro_img;
							}
							saleProduct_info[i].pro_img = product_image.slice(0);
						}

						if(i + 1 == pro_idx.length){
						end();
						
					}
				});
				}
				//pro_idx가 없을 경우(상품이 없을 경우) 다음 단계 진행 (끝)
				if(saleProduct_info.length == 0){
					callback(null, "No data");
					connections.release();
					return;
				}

				for(var i = 0 ; i < saleProduct_info.length ; i++){
					makeReserve(i, saleProduct_info);
				}

				let end = function(){
					callback(null);
					connections.release();
				}
			})();


		},
		// 6. 추천상품 가져오기 (사용자의 선택 카테고리를 거리순으로 추천)
		function(callback){
			let cnt = 0;
			let getInterestQuery = ""; // 사용자의 관심 카테고리를 가져옴

			// 관심 카테고리인 상품들이 있는 상품과 마켓정보 (팔린 상품, timesale 상품 제외)
			let getRecoQuery ="SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_addr, mar_locate_lat, mar_locate_long FROM market NATURAL JOIN product WHERE pro_cate = ? AND pro_issell AND pro_istimesale = 0 AND mar_idx IN (SELECT mar_idx FROM product WHERE pro_cate = ?)";

			if(identify == 0)
				getInterestQuery = "SELECT interest FROM interest WHERE user_idx = ?";
			else
				getInterestQuery = "SELECT interest FROM interest WHERE sup_idx = ?";

			(async function(){
				let connections = await pool_async.getConnection();
				let result = await pool_async.query(getInterestQuery, identify_data.idx);

				let interest = result[0];
				for(let i = 0 ; i < interest.length ; i++){
					let result = await pool_async.query(getRecoQuery, [interest[i].interest, interest[i].interest]);
					let interestPro = result[0];

					for(let j = 0 ; j < interestPro.length ; j++){
						reco_data[cnt] = {};

						interestPro[j].dist = distance(identify_data.addr_lat, identify_data.addr_long, interestPro[j].mar_locate_lat, interestPro[j].mar_locate_long);
						delete interestPro[j].mar_addr; // 프로퍼티 삭제
						delete interestPro[j].mar_locate_lat;
						delete interestPro[j].mar_locate_long;

						reco_data[cnt] = interestPro[j];
						cnt++;
					}
				}

				reco_data.sort(function(a, b){
					if(a.dist === b.dist){
						return 0;
					} else {
						return a.dist - b.dist
					}
				});

				//console.log(products);

				connections.release();
				callback(null);

			})();
		},

		// 7. 추천상품 이미지 가져오기
		function(callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			(async function(){
				let connections = await pool_async.getConnection();

				for(let i = 0 ; i < reco_data.length ; i++){
					let result = await pool_async.query(getProductImageQuery, reco_data[i].pro_idx);
					if(result[0].length != 0){
						let img = result[0]
						reco_data[i].pro_img = img[0].pro_img;
					}
				}

				connections.release();
				callback(null, "Success to get data");
			})();

		}
		];


    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {
			res.status(200).send({
				message : "Success to get data",
				data : saleProduct_info,
				reco : reco_data
			});
			console.log(result);
		}
	});		
});

module.exports = router;
