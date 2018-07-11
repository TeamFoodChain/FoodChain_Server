const distance = require('../module/distance.js').calculateDistance;
const async = require('async');
const pool = require('../config/dbPool.js');
const pool_async = require('../config/dbPool_async.js');


const authModel = require('../models/AuthModel');


module.exports.category = (pro_cate, authData, callback) => {
	let saleProduct_info = [];
	let product = {};
	let product_image = [];

	let market = []; // 반경 내의 마켓 정보
	let mar_idx_distance = []; // market을 이용해 반경 내에서 거리순으로 재배열


	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "pool.getConnection Error : " + err]);
				} else {
					callback(null, connection);
				}
			});
		},
		// 2. 주변 마켓 정보 검색 쿼리 다시 생각할 것
		function(connection, callback){
			let getMarketQuery = "SELECT * FROM market WHERE abs(? - mar_locate_lat) <= 0.009 AND abs(? - mar_locate_long) <= 0.0114";
			connection.query(getMarketQuery,[authData.addr_lat, authData.addr_long], function(err, result){
				if(result.length == 0){ // 해당 데이터가 없다 
					connection.release();
					console.log("No data");
					callback([200, "No data"]);
					return;
				}

				if(err) {
					connection.release();
					console.log("connection.query Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					for(let i = 0 ; i < result.length ; i++){
						market.push(result[i]);
					}
					callback(null);
					connection.release();
				}
			});
		},

		// 3. 반경(2km)안에 있는 market의 idx를 가지고, 거리 순으로 mar_idx를 정렬
		function(callback){
			if(market.length == 0){ // 주변 마켓이 아무것도 없을 때 예외처리

			}
			for(let i = 0 ; i < market.length ; i++){
				mar_idx_distance.push([market[i].mar_idx, distance(authData.addr_lat, authData.addr_long, market[i].mar_locate_lat, market[i].mar_locate_long)]);
			}

			mar_idx_distance.sort(function(a, b){ // 오름차순 (거리순) 정렬
				if(a[1] === b[1]){
					return 0;
				} else{
					return a[1]-b[1];
				}
			});
			//console.log(mar_idx_distance);

			callback(null);
		}, 
		// 4. 반경 안에 있는, 거리 순으로 정렬된 마켓에 있는 상품들을 가져온다. (팔린 상품, timesale 상품 제외)
		function(callback){
			let dd = [];
			let getProuctFromMarketQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_issell = 0 AND pro_istimesale = 0 AND pro_cate LIKE" + "'%" + pro_cate + "%'";
			let cnt = 0;
			(async function(){
				let connection = await pool_async.getConnection();
				for(let i = 0 ; i < mar_idx_distance.length ; i++){
					let result = await connection.query(getProuctFromMarketQuery, mar_idx_distance[i][0]);
					let data = result[0];

					if(result === undefined){
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					}

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
						saleProduct_info[cnt] = product;
						//console.log(saleProduct_info[cnt]);
						cnt++;
					});
					}

				}

				callback(null);
				connection.release();
			})();
		},

		// 5. 상품 이미지를 가져온다.
		function(callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			(async function(){
				let connection = await pool_async.getConnection();

				for(let i = 0 ; i < saleProduct_info.length ; i++){
					let result = await connection.query(getProductImageQuery, saleProduct_info[i].pro_idx);
					let data = result[0];


					if(result === undefined){
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					}

					if(data.length != 0){
						product_image = [];
						for(let j = 0 ; j < data.length ; j++){
							product_image[j] = data[j].pro_img;
						}
						//console.log("dddd : "+ product_image); // 여기가 callback 되고 나서, res.status가 찍히고 나서도 실행이 된다. 왜그럴까?
						saleProduct_info[i].pro_img = product_image.slice(0);
					}

					saleProduct_info.sort(function(a, b){
						if(a.dist === b.dist){
							return 0;
						} else {
							return a.dist - b.dist;
						}
					});
				}

				callback(null, "Success to get data");
				connection.release();
			})();
		}
		];


    async.waterfall(taskArray, async function(err, result){
		if(err){
			console.log(err);
			callback(err);
		} else {
			callback(null, saleProduct_info);
			console.log(result);
		}
	});	
}

module.exports.main = (authData, callback) => {
	let saleProduct_info = []; // 최신상품들을 담는 배열
	let product = {}; // saleProduct_info에 상품을 담을 객체
	let product_image = []; // 최신상품들의 이미지를 담을 배열


	let reco_data = []; // 추천상품을 담을 배열

	let mar_idx =  []; // 사용자 설정 위치 반경 2km 이내의 마켓들의 index
	
	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection);
				}
			});
		},
	
		// 2. 주변 마켓 정보 검색 쿼리 다시 생각할 것
		function(connection, callback){
			let getMarketQuery = "SELECT * FROM market WHERE abs(? - mar_locate_lat) <= 0.009 AND abs(? - mar_locate_long) <= 0.0114";
			connection.query(getMarketQuery, [authData.addr_lat, authData.addr_long], function(err, result){
				if(result.length == 0){ // 해당 토큰이 없다 
					connection.release();
					callback([400, "Invalied User"]);
					return;
				}

				if(err) {
					connection.release();
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					for(let i = 0 ; i < result.length ; i++){
						mar_idx.push(result[i].mar_idx);
					}
					callback(null);
					connection.release();
				}
			});
		},

		// 3. 마켓 index를 가지고 product search, 등록 순 (팔린 상품, timesale 상품 제외)
		function(callback){
			let getProductDataQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_issell = 0 AND pro_istimesale = 0 ORDER BY pro_regist_date DESC";
			let cnt = 0; // null인 값을 피하기 위해 cnt로 count한다.
			console.log(mar_idx);

			(async function(){
				let connection = await pool_async.getConnection();
				for(let i = 0 ; i < mar_idx.length ; i++){
					let result = await connection.query(getProductDataQuery, mar_idx[i]);
					let data = result[0];

					if(result === undefined){
						connection.release();
						console.log("pool.getConnection Error : " + err);
						callback([500, "Internal Server Error"]);
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

				callback(null);
				connection.release();
			})();
		},
		// 4. 상품 image 가져오기
		function(callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";


			(async function(){
				let connection = await pool_async.getConnection();
				for(let i = 0 ; i < saleProduct_info.length ; i++){
					let result = await connection.query(getProductImageQuery, saleProduct_info[i].pro_idx);
					let data = result[0];

					if(result === undefined){
						connection.release();
						console.log("pool.getConnection Error : " + err);
						callback([500, "Internal Server Error"]);
					}

					if(data.length != 0){
						product_image = [];
						for(let j = 0 ; j < data.length ; j++){
							product_image[j] = data[j].pro_img;
						}
						saleProduct_info[i].pro_img = product_image.slice(0);
					}

				}

				callback(null);
				connection.release();
			})();
		},
		// 5. 추천상품 가져오기 (사용자의 선택 카테고리를 거리순으로 추천)
		function(callback){
			let cnt = 0;
			let getInterestQuery = ""; // 사용자의 관심 카테고리를 가져옴

			// 관심 카테고리인 상품들이 있는 상품과 마켓정보 (팔린 상품, timesale 상품 제외)
			let getRecoQuery ="SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_addr, mar_locate_lat, mar_locate_long FROM market NATURAL JOIN product WHERE pro_cate = ? AND pro_issell AND pro_istimesale = 0 AND mar_idx IN (SELECT mar_idx FROM product WHERE pro_cate = ?)";

			if(authData.identify ==0)
				getInterestQuery = "SELECT interest FROM interest WHERE user_idx = ?";
			else
				getInterestQuery = "SELECT interest FROM interest WHERE sup_idx = ?";

			(async function(){
				let connections = await pool_async.getConnection();
				let result = await pool_async.query(getInterestQuery, authData.idx);

				let interest = result[0];
				for(let i = 0 ; i < interest.length ; i++){
					let result = await pool_async.query(getRecoQuery, [interest[i].interest, interest[i].interest]);
					let interestPro = result[0];

					for(let j = 0 ; j < interestPro.length ; j++){
						reco_data[cnt] = {};

						interestPro[j].dist = distance(authData.addr_lat, authData.addr_long, interestPro[j].mar_locate_lat, interestPro[j].mar_locate_long);
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

		// 6. 추천상품 이미지 가져오기
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
			callback(err);
		} else {
			console.log(result);
			callback(null, saleProduct_info, reco_data);
		}
	});		
}

module.exports.product = (pro_idx, mar_idx, callback) => {
	let product_info = {}; //상품 정보
	let supplier_info = {}; // 공급자 정보
	let pro_img = []; // 상품 이미지 정보
	let sup_others = []; // 공급자의 다른 상품 정보들을 담는 배열 
	let othersData = {}; // 다른 상품 정보를 담을 객체

	// 디폴트 데이터
	product_info.pro_idx = {}
	product_info.pro_name = {};
	product_info.pro_ex_date = {};
	product_info.pro_info = {};
	product_info.pro_img = {};

	supplier_info.sup_name = {};
	supplier_info.sup_img = {};
	supplier_info.sup_addr = {};
	supplier_info.sup_others = {};
	
	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection);
				}
			});
		},

		// 2. 상품, 공급자 정보 가져오기
		function(connection, callback){
			let getPorductDataQuery = "SELECT * FROM product NATURAL JOIN market NATURAL JOIN supplier WHERE pro_idx =? AND mar_idx = ?";
			let getProductImgQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";
			let getSup_OtherQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_idx NOT IN (?)";
			
			// mar_idx, pro_idx로 공급자의 다른 상품 까지 검색(NOT IN), 다른 상품(EXIST)의 대표이미지만(GROUP BY) 가져온다.
			let getSup_OtherImgQuery = "SELECT * FROM (SELECT * FROM product_image WHERE EXISTS (SELECT pro_idx FROM product WHERE mar_idx = ? AND pro_idx NOT IN (?))) AS A  WHERE pro_idx NOT IN (?) GROUP BY pro_idx";

			connection.query(getPorductDataQuery, [pro_idx, mar_idx], function(err, result){
				if(err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else { // 길이가 0 (아이템이 없는 경우)를 고려 해줘야 할까?
					product_info.pro_idx = result[0].pro_idx;
					product_info.pro_name = result[0].pro_name;
					product_info.pro_ex_date = result[0].pro_ex_date;
					product_info.pro_info = result[0].pro_info;

					supplier_info.sup_name = result[0].sup_name;
					supplier_info.sup_img = result[0].sup_img;
					supplier_info.sup_addr = result[0].sup_addr;
				}
			});

			connection.query(getProductImgQuery, pro_idx, function(err, result){
				if(err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else{
					for(let i = 0 ; i < result.length ; i++){
						pro_img.push(result[i].pro_img);
					}
					product_info.pro_img = pro_img;
				}
			});

			connection.query(getSup_OtherQuery, [mar_idx, pro_idx], function(err, result){
				if(err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else{
					for(let i = 0 ; i < result.length ; i++){
					othersData = {}; // 초기화
					othersData.pro_idx = result[i].pro_idx;
					othersData.pro_name = result[i].pro_name;
					othersData.pro_ex_date = result[i].pro_ex_date;
					sup_others.push(othersData);
				}
				supplier_info.sup_others = sup_others;
			}
			});

			connection.query(getSup_OtherImgQuery, [mar_idx, pro_idx, pro_idx], function(err, result){
				if(err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else{
					let j = 0;
				// 다른 상품들 중 사진이 있는 것만 image 추가
				for(let i = 0 ; i < supplier_info.sup_others.length ; i++){
					if(!result.length==0 && result[j].pro_idx == supplier_info.sup_others[i].pro_idx){
						supplier_info.sup_others[i].pro_img = result[j].pro_img; // 대표 사진 하나만
						j++;
						if(j==result.length) // 전체에서 부분을 비교하니까 부분 입장에서 갯수를 다 채우면 break;
						break;
					} else{	
						supplier_info.sup_others[i].pro_img = {};
					}
				}
				callback(null, "success to get products");
			}
			connection.release();
		});


		}
		];

    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
			callback(err);
		} else {
			console.log(result);
			callback(null, product_info, supplier_info);
		}
	});		
}