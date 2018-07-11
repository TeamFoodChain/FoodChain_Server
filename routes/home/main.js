const express = require('express');
const router = express.Router();
const distance = require('../../module/distance.js').calculateDistance;
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;
const identifier = require('../../module/token_identifier.js');

//추천 상품, 쿠폰 홍보 배너, 최신상품(동네 위치 기준 20개)
//쿠폰 홍보 배너 아직 보류 구현 남음


router.get('/', (req, res) =>{
	let saleProduct_info = []; // 최신상품들을 담는 배열
	let product = {}; // saleProduct_info에 상품을 담을 객체
	let product_image = []; // 최신상품들의 이미지를 담을 배열


	let reco_data = []; // 추천상품을 담을 배열

	let mar_idx =  []; // 사용자 설정 위치 반경 2km 이내의 마켓들의 index
	let token = req.headers.token;
	let decoded = jwt.verify(token); // 밑에서 identify를 써야돼서 다시 씀...

	let identify = decoded.identify;	

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
			let getMarketQuery = "SELECT * FROM market WHERE abs(? - mar_locate_lat) <= 0.009 AND abs(? - mar_locate_long) <= 0.0114";
			connection.query(getMarketQuery, [identify_data.addr_lat, identify_data.addr_long], function(err, result){
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
						mar_idx.push(result[i].mar_idx);
					}
					callback(null, identify_data);
					connection.release();
				}
			});
		},

		// 4. 마켓 index를 가지고 product search, 등록 순 (팔린 상품, timesale 상품 제외)
		function(identify_data, callback){
			let getProductDataQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_issell = 0 AND pro_istimesale = 0 ORDER BY pro_regist_date DESC";
			let cnt = 0; // null인 값을 피하기 위해 cnt로 count한다.
			console.log(mar_idx);

			(async function(){
				let connection = await pool_async.getConnection();
				for(let i = 0 ; i < mar_idx.length ; i++){
					let result = await connection.query(getProductDataQuery, mar_idx[i]);
					let data = result[0];

					if(result === undefined){
						res.status(500).send({
							message : "Internal Server Error"
						});
						connection.release();
						callback("connection.query Error : " + err);
					}
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

				}

				callback(null, identify_data);
				connection.release();
			})();
		},
		// 5. 상품 image 가져오기
		function(identify_data, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";


			(async function(){
				let connection = await pool_async.getConnection();
				for(let i = 0 ; i < saleProduct_info.length ; i++){
					let result = await connection.query(getProductImageQuery, saleProduct_info[i].pro_idx);
					let data = result[0];

					if(result === undefined){
						res.status(500).send({
							message : "Internal Server Error"
						});
						connection.release();
						callback("connection.query Error : " + err);
					}

					if(data.length != 0){
						product_image = [];
						for(let j = 0 ; j < data.length ; j++){
							product_image[j] = data[j].pro_img;
						}
						saleProduct_info[i].pro_img = product_image.slice(0);
					}

				}

				callback(null, identify_data);
				connection.release();
			})();
		},
		// 6. 추천상품 가져오기 (사용자의 선택 카테고리를 거리순으로 추천)
		function(identify_data, callback){
			let cnt = 0;
			let getInterestQuery = ""; // 사용자의 관심 카테고리를 가져옴

			// 관심 카테고리인 상품들이 있는 상품과 마켓정보 (팔린 상품, timesale 상품 제외)
			let getRecoQuery ="SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_addr, mar_locate_lat, mar_locate_long FROM market NATURAL JOIN product WHERE pro_cate = ? AND pro_issell AND pro_istimesale = 0 AND mar_idx IN (SELECT mar_idx FROM product WHERE pro_cate = ?)";

			if(identify ==0)
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
