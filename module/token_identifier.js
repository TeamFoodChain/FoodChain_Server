const express = require('express');
const router = express.Router();
const jwt = require('./jwt.js');
const async = require('async');
const pool = require('../config/dbPool_async.js');
const secretKey = require('../config/secretKey.js').secret;




// user인지 supplier인지 식별 후, 데이터 전달
module.exports = function(token, callback){
	let identify_data = {}; // user, supplier 식별 후 담을 데이터	

	let decoded = jwt.verify(token);

	// token verify
	if (decoded == -1) {
		callback("token err");
		return ;
	}

	let id = decoded.id;
	let pw = decoded.pw;
	let identify = decoded.identify;

	(async function(){
		console.log(id);
		let getIdentifiedDataQuery ="";
			if(identify == 0) // user 일 때
				getIdentifiedDataQuery = "SELECT * FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT * FROM supplier WHERE sup_token = ? ";
			
			let connection = await pool.getConnection();
			let result = await pool.query(getIdentifiedDataQuery, token);
			let data = result[0]
				if(data.length == 0){ // 해당 토큰이 없다 
					connection.release();
					console.log("Invalied User");
					callback("Invalied User");
					return ; // return 시 err
				}

				if(!data) {
					connection.release();
					console.log("Internal Server Error");
					callback("Internal Server Error");
					return ;
				} else {

					if(identify == 0){ // user 일 때, email 또는 phone이 id가 된다.
						if((id === data[0].user_email || id === data[0].user_phone) && pw === data[0].user_pw){
							console.log("success to verify");
						} else {
							connection.release();
							console.log("Invalid token error");
							callback("Invalid token error");
							return ;
						}

						// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data.identify = identify;
					identify_data.idx = data[0].user_idx;
					identify_data.name = data[0].user_name;
					identify_data.email = data[0].user_email;
					identify_data.phone = data[0].user_phone;
					identify_data.id = data[0].user_id;
					identify_data.addr = data[0].user_addr;
					identify_data.addr_lat = data[0].user_addr_lat;
					identify_data.addr_long = data[0].user_addr_long;


					}

					else{ // supplier 일 때
						if((id === data[0].sup_email || id === data[0].sup_phone) && pw === data[0].sup_pw){
							console.log("success to verify");
						} else {
							connection.release();
							console.log("Invalid token error");
							callback("Invalid token error");
							return ;
						}
							// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data.identify = identify;
					identify_data.idx = data[0].sup_idx;
					identify_data.name = data[0].sup_name;
					identify_data.email = data[0].sup_email;
					identify_data.phone = data[0].sup_phone;
					identify_data.id = data[0].sup_id;
					identify_data.mar_idx = data[0].mar_idx;
					identify_data.addr = data[0].sup_addr;
					identify_data.addr_lat = data[0].sup_addr_lat;
					identify_data.addr_long = data[0].sup_addr_long;
				
					}
					connection.release();
				}
				callback(0, identify_data); // err : 0 result : identify_data

	})();
}