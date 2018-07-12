const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;
const identifier = require('../../module/token_identifier.js');

router.get('/', (req, res) => {
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

	let pro_idx = req.query.pro_idx;
	let mar_idx = req.query.mar_idx;


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
				callback(null);
			}).catch(function(err){
				res.status(500).send({
					message : err
				});
				return ;
				console.log(err);
			});
		},
		// 2. pool에서 connection 하나 가져오기
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

		// 3. 상품, 공급자 정보 가져오기
		function(connection, callback){
			let getPorductDataQuery = "SELECT * FROM product NATURAL JOIN market NATURAL JOIN supplier WHERE pro_idx =? AND mar_idx = ?";
			let getProductImgQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";
			let getSup_OtherQuery = "SELECT * FROM product WHERE mar_idx = ? AND pro_idx NOT IN (?)";
			
			// mar_idx, pro_idx로 공급자의 다른 상품 까지 검색(NOT IN), 다른 상품(EXIST)의 대표이미지만(GROUP BY) 가져온다.
			let getSup_OtherImgQuery = "SELECT * FROM (SELECT * FROM product_image WHERE EXISTS (SELECT pro_idx FROM product WHERE mar_idx = ? AND pro_idx NOT IN (?))) AS A  WHERE pro_idx NOT IN (?) GROUP BY pro_idx";

			connection.query(getPorductDataQuery, [pro_idx, mar_idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
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
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
				} else{
					for(let i = 0 ; i < result.length ; i++){
						pro_img.push(result[i].pro_img);
					}
					product_info.pro_img = pro_img;
				}
			});

			connection.query(getSup_OtherQuery, [mar_idx, pro_idx], function(err, result){
				if(err) {
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
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
					res.status(500).send({
						message : "Internal Server Error"
					});
					callback("connection.query Error : " + err);
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
				callback(null, "Success to Get Data");
			}
			connection.release();
		});


		}
		];

    async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
		} else {
			res.status(200).send({
				message : "Success to Get Data",
				product_info : product_info,
				supplier_info : supplier_info
			});
			console.log(result);
		}
	});		
});





module.exports = router;
