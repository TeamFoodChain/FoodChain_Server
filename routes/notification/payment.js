const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const async = require('async');
const pool = require('../../config/dbPool.js');
const pool_async = require('../../config/dbPool_async.js');
const secretKey = require('../../config/secretKey.js').secret;

router.get('/', (req, res, next) => {
	let identify = 0;
	let idx = 1;
	let products = [];
	let cnt = 0;
	let getInterestQuery = "";
	let getRecoQuery = "SELECT pro_idx, pro_name, pro_price, pro_sale_price, mar_addr, mar_locate_lat, mar_locate_long FROM market NATURAL JOIN product WHERE pro_cate = ? AND mar_idx IN (SELECT mar_idx FROM product WHERE pro_cate = ?)";
			if(identify == 0)
				getInterestQuery = "SELECT interest FROM interest WHERE user_idx = ?";
			else
				getInterestQuery = "SELECT interest FROM interest WHERE sup_idx = ?";

			(async function(){
				console.log("Ddd");
			let connections = await pool_async.getConnection();
			let result = await pool_async.query(getInterestQuery, 1);

			let interest = result[0];
			for(let i = 0 ; i < result[0].length ; i++){
				let recoResult = await pool_async.query(getRecoQuery, [interest[i].interest, interest[i].interest]);
				let d = recoResult[0];
				for(let j = 0 ; j < recoResult[0].length ; j++){
					products[cnt] = {};
					products[cnt].products = d[j];
					cnt++;
				}
			}
			console.log(products);


			//console.log(result);
			})();
});
module.exports = router;