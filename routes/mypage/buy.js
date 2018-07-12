const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;
const moment = require('moment');
const upload = require('../../config/s3multer.js');
const identifier = require('../../module/token_identifier.js');


router.get('/', (req, res) => {
	let Data = [];
	let product_pack = [];
	let product = {};
	let product_image = [];
	let market = [];

	let pro_idx = [];

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
		// 3. shop_list 테이블에서 구매한 상품 index를 가져온다.
		function(connection, identify_data, callback) {
			let getBuyProductQuery = "";
			if(identify_data.identify == 0)
				getBuyProductQuery = "SELECT pro_idx FROM shop_list WHERE user_idx = ?";
			else
				getBuyProductQuery = "SELECT pro_idx FROM shop_list WHERE sup_idx = ?";
				
			connection.query(getBuyProductQuery, identify_data.idx, function(err, result){
				if(err){
					res.status(500).send({
						message : "Internal Server Error"
					})
					return ;
				} else if(result.length != 0){
					for(let i = 0 ; i < result.length ; i++){
						pro_idx[i] = result[i];
					}
					callback(null, connection, identify_data);
				} else{
					callback("No Data");
				}

			});
				
		},
		// 4. shop_list에서 상품들에 대한 mar_idx를 중복제거하여 가져온다.
		function(connection, identify_data, callback){
			let getMar_idxQuery = "";
			if(identify_data.identify == 0)
				getMar_idxQuery ="SELECT * FROM market WHERE mar_idx IN (SELECT DISTINCT mar_idx FROM shop_list JOIN product USING (pro_idx) WHERE user_idx = ?)";
			else
				getMar_idxQuery ="SELECT * FROM market WHERE mar_idx IN (SELECT DISTINCT mar_idx FROM shop_list JOIN product USING (pro_idx) WHERE sup_idx = ?)";
			connection.query(getMar_idxQuery, identify_data.idx, function(err, result){
				if(err){
					res.status(500).send({
						message : "Internal Server Error"
					});
					console.log("Internal Server Error");
					callback("Internal Server Error");
					return;
				} else{
					for(let i = 0 ; i<result.length ; i++){
						market[i] ={};
						market[i].mar_idx =result[i].mar_idx;
						market[i].mar_name =result[i].mar_name;
						market[i].mar_addr =result[i].mar_addr;
						market[i].mar_locate_lat =result[i].mar_locate_lat;
						market[i].mar_locate_long =result[i].mar_locate_long;
					}
					callback(null, connection, identify_data);
				}
			});
		},
		// 5. 상품 이미지 가져오기
		function(connection, identify_data, callback){
			let getProudctImageQuery = "SELECT * FROM product_image WHERE pro_idx = ? limit 1";
			let cnt = 0;

			(async function(){
				let connections = await pool_async.getConnection();

				for(let i = 0 ; i < pro_idx.length ; i++){
					let result = await connections.query(getProudctImageQuery, pro_idx[i].pro_idx);
					if(!result){
						res.status(500).send({
							message : "Internal Server Error"
						});
						console.log("Internal Server Error");
						callback("Internal Server Error");
						return;
					} else{
						if(result[0].length!=0){
							let dd = result[0];
							product_image[cnt] = {pro_idx : dd[0].pro_idx, pro_img : dd[0].pro_img};
							cnt++;
						}
					}
				}

				callback(null, connection, identify_data);
				connections.release();

			})();

		},
		// 6. pro_idx 값을 가지고 상품, 마켓 데이터 가져오기
		function(connection, identify_data, callback){
			let cnt = 0;
			let getProductMarketQuery = "";
			if(identify_data.identify == 0){
				getProductMarketQuery = "SELECT mar_idx, sup_idx, sup_phone, mar_name, mar_addr, mar_locate_lat," +
				"mar_locate_long, pro_idx, pro_name, pro_price, pro_sale_price FROM supplier JOIN "+
				"(SELECT * FROM market NATURAL JOIN (SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_idx FROM shop_list JOIN product USING (pro_idx) WHERE user_idx = ?) AS A) AS B USING (mar_idx)";
			} else {
				getProductMarketQuery = "SELECT mar_idx, sup_idx, sup_phone, mar_name, mar_addr, mar_locate_lat," +
				"mar_locate_long, pro_idx, pro_name, pro_price, pro_sale_price FROM supplier JOIN "+
				"(SELECT * FROM market NATURAL JOIN (SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_idx FROM shop_list JOIN product USING (pro_idx) WHERE sup_idx = ?) AS A) AS B USING (mar_idx)";
			}

			connection.query(getProductMarketQuery, identify_data.idx, function(err, result){
				if(err){
					res.status(500).send({
						message : "Internal Server Error"
					});
					console.log("Internal Server Error");
					callback("Internal Server Error");
					return;
				}
				for(let i = 0 ; i < market.length ; i++){
					product_pack[i] = [];
					for(let j = 0 ; j < result.length ; j++){
						if(market[i].mar_idx == result[j].mar_idx){
							product = {};
							product.mar_idx = result[j].mar_idx;
							product.pro_idx = result[j].pro_idx;
							product.pro_name = result[j].pro_name;
							product.pro_price = result[j].pro_price;
							product.pro_sale_price = result[j].pro_sale_price;
							//console.log(product);
							product_pack[i].push(product);
						}
					}
					market[i].products = product_pack[i];
				}

				// for(let i = 0 ; i < market.length ; i++){
				// 	for(let j = 0 ; j < result.length ; j++){
				// 		if(market[i].mar_idx == product_pack[j].mar_idx){
				// 			market[i].products = [];
				// 			market[i].products.push(product_pack[j]);
				// 		}
				// 	}
				// }
				callback(null, connection, identify_data);
			});
		},

		// 7. 이미지 넣기
		function(connection, identify_data, callback){
			let cnt = 0;
			for(let i = 0 ; i < market.length ; i++){
				for(let j = 0 ; j < product_image.length ; j++){
					///console.log(market[i].products[j]);
					if(market[i].products[j].pro_idx == product_image[cnt].pro_idx)
						market[i].products[j].pro_img = product_image[cnt].pro_img;
					else
						market[i].products[j].pro_img = "";
				}
			}

			callback(null, "Success to Get Data");
			connection.release();
		}
		
	];

	async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				res.status(200).send({
						message : "Success to Get Data",
						data : market
					});
				console.log(result);
			}
		});

});


module.exports = router;
