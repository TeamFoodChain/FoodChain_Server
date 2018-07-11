const express = require('express');
const router = express.Router();
const distance = require('../../module/distance.js').calculateDistance;
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;
const identifier = require('../../module/token_identifier.js');


router.get('/', (req, res) => {
	let pro_cate = req.query.pro_cate;

	let saleProduct_info = [];
	let product = {};
	let product_image = [];

	let market = []; // 반경 내의 마켓 정보
	let mar_idx_distance = []; // market을 이용해 반경 내에서 거리순으로 재배열

    let token = req.headers.token;

	let taskArray = [
		// 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
		function(callback){
			let email;
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
		function(connection,identify_data, callback){
			let getMarketQuery = "SELECT * FROM market WHERE abs(? - mar_locate_lat) <= 0.009 AND abs(? - mar_locate_long) <= 0.0114";
			connection.query(getMarketQuery,[identify_data.addr_lat, identify_data.addr_long], function(err, result){
				if(result.length == 0){ // 해당 데이터가 없다 
					res.status(200).send({
						message : "No data"
					});
					connection.release();
					callback("No data");
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
						market.push(result[i]);
					}
					callback(null, identify_data);
					connection.release();
				}
			});
		},

		// 4. 반경(2km)안에 있는 market의 idx를 가지고, 거리 순으로 mar_idx를 정렬
		function(identify_data, callback){ // data : identify_data
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
						res.status(500).send({
							message : "Internal Server Error"
						});
						connection.release();
						callback("connection.query Error : " + err);
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
		} else {
			res.status(200).send({
				message : "success to get data",
				data : saleProduct_info
			});
			console.log(result);
		}
	});	

});


module.exports = router;
