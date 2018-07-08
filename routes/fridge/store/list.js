const express = require('express');
const router = express.Router();
const distance = require('../../../module/distance.js').calculateDistance;
const jwt = require('../../../module/jwt.js');
const async = require('async');
const pool = require('../../../config/dbPool.js');
const pool_async = require('../../../config/dbPool_async.js');
const secretKey = require('../../../config/secretKey.js').secret;
const identifier = require('../../../module/token_identifier.js');

router.get('/', (req, res) => {
	let product = []; // 전달 할 상품 정보 배열

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
		// 2. 공급자가 올린 상품을 가져온다. (판매 중, 판매완료, 타임세일 상관없이 다 가져옴)
		function(identify_data, callback){
			let getSaleProductQuery = "SELECT pro_idx, pro_name, pro_ex_date, pro_regist_date, pro_info FROM product WHERE mar_idx IN (SELECT mar_idx FROM supplier WHERE sup_idx = ?)";

			(async function(){
				let connections = await pool_async.getConnection();
				let result = await pool_async.query(getSaleProductQuery, identify_data.idx);

				for(let i = 0 ; i < result[0].length ; i++){
					let item = result[0];
					product[i] = {};
					product[i].pro_idx = item[i].pro_idx;
					product[i].pro_name = item[i].pro_name;
					product[i].pro_ex_date = item[i].pro_ex_date;
					product[i].pro_regist_date = item[i].pro_regist_date;
					product[i].pro_info = item[i].pro_info;
					product[i].pro_img = null;
				}
				connections.release();
				callback(null);
			})();
		},
	// 3. 상품 이미지 가져오기
	function(callback){
		let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";
		(async function(){
			let connections = await pool_async.getConnection();
			for(let i = 0 ; i < product.length ; i++){
				let result = await pool_async.query(getProductImageQuery, product[i].pro_idx);
				if(result[0].length != 0){
					let img = result[0]
					product[i].pro_img = img[0].pro_img;
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
				data : product
			});
			console.log(result);
		}
	});			
});


module.exports = router;
