const express = require('express');
const router = express.Router();
const jwt = require('./jwt.js');
const async = require('async');
const pool = require('../config/dbPool.js');
const secretKey = require('../config/secretKey.js').secret;


let identify_data = {}; // user, supplier 식별 후 담을 데이터

// user인지 supplier인지 식별 후, 데이터 전달
module.exports = function(token){
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
	let result = function(){
		let getIdentifiedDataQuery ="";
			if(identify == 0) // user 일 때
				getIdentifiedDataQuery = "SELECT * FROM user WHERE user_token = ? "
			else // supplier 일 때
				getIdentifiedDataQuery = "SELECT * FROM supplier WHERE sup_token = ? ";
			
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
							idx = result[0].user_idx;
						} else {
							res.status(400).send({
								message : "Invalid token error"
							});
							connection.release();
							callback("Invalid token error");
							return;
						}

						// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data._identify = identify;
					identify_data._idx = result[0].user_idx;
					identify_data._name = result[0].user_name;
					identify_data._email = result[0].user_email;
					identify_data._phone = result[0].user_phone;
					identify_data._id = result[0].user_id;
					identify_data._addr = result[0].user_addr;
					identify_data._addr_lat = result[0].user_addr_lat;
					identify_data._addr_long = result[0].user_addr_long;


					}

					else{ // supplier 일 때
						if(email === result[0].sup_email && phone === result[0].sup_phone){
							console.log("success to verify");
							idx = result[0].supplier_idx;
						} else {
							res.status(400).send({
								message : "Invalid token error"
							});
							connection.release();
							callback("Invalid token error");
							return;
						}
							// 다음 function을 위해 identify_data라는 변수로 통일시켜 준다. (user_~~, sup_~~ 로 나뉘기 때문)
					identify_data._identify = identify;
					identify_data._idx = result[0].sup_idx;
					identify_data._name = result[0].sup_name;
					identify_data._email = result[0].sup_email;
					identify_data._phone = result[0].sup_phone;
					identify_data._id = result[0].sup_id;
					identify_data._addr = result[0].sup_addr;
					identify_data._addr_lat = result[0].sup_addr_lat;
					identify_data._addr_long = result[0].sup_addr_long;
				
					}
					connection.release();
					console.log("Dd");
					return identify_data;
				}
			});
	};

	return identify_data;
}