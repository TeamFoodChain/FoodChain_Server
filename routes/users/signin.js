const express = require('express');
const router = express.Router();

const crypto = require('crypto-promise');
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');

router.post('/',async(req, res) =>{
	let identify = req.headers.identify;
	let user_id = req.body.user_id;
	let user_pw = req.body.user_pw;
	
	let token;
	let checkQuery;
	let checkResult;

    if (!user_id || !user_pw || !identify) {
		res.status(400).send({
			message : "Null Value"
		});
	}else{
		if (identify == 0) { // 일반 유저 login
			if (user_id.indexOf("@") != -1) {
				checkQuery = 'SELECT * FROM user WHERE user_email = ?';
				checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
			}else{
				checkQuery = 'SELECT * FROM user WHERE user_phone = ?';
				checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
			}

			if (!checkResult) {												
				res.status(500).send({
					message : "Internal Server Error"
				});
			}else if(checkResult.length === 1){ // user_id에 해당하는 row가 있을 때 
				let hashedpw = await crypto.pbkdf2(user_pw,checkResult[0].user_salt, 100000,32,'sha512');
	
				if(hashedpw.toString('base64') === checkResult[0].user_pw){
					token = jwt.sign(checkResult[0].user_email, checkResult[0].user_pw, 0);
					insertQuery = 'UPDATE user SET user_token = ? WHERE user_idx = ?';
					insertResult = await db.queryParam_Arr(insertQuery, [token, checkResult[0].user_idx]);
					if (!insertResult) {
						res.status(500).send({
							message : "insert token fail",
							token : token
						});
					}else{
						res.status(201).send({
							message : "success siggin",
							token : token
						});
					}
				}else{
					console.log("hashedpw : " + hashedpw.toString('base64'));
					console.log("user_pw : " + checkResult[0].user_pw);
					res.status(400).send({
						message:"fail signin from client, login failed"
					});
				}
			}else{
				res.status(400).send({
					message:"incorrect information"
				});
				console.log("id error");
			}
		} else if (identify == 1) { // 공급자 login
			if (user_id.indexOf("@") != -1) {
				checkQuery = 'SELECT * FROM supplier WHERE sup_email = ?';
				checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
			}else{
				checkQuery = 'SELECT * FROM supplier WHERE sup_phone = ?';
				checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
			}

			if (!checkResult) {												
				res.status(500).send({
					message : "Internal Server Error"
				});
			}else if(checkResult.length === 1) {// user_id에 해당하는 row가 있을 때 
				let hashedpw = await crypto.pbkdf2(user_pw,checkResult[0].sup_pw_salt, 100000,32,'sha512');
	
				if(hashedpw.toString('base64') === checkResult[0].sup_pw){
					console.log(identify);
					token = jwt.sign(checkResult[0].sup_email, checkResult[0].sup_pw, 1);
					console.log(token);
					insertQuery = 'UPDATE supplier SET sup_token = ? WHERE sup_idx = ?';
					insertResult = await db.queryParam_Arr(insertQuery, [token, checkResult[0].sup_idx]);
					if (!insertResult) {
						res.status(500).send({
							message : "insert token fail",
							token : token
						});
					}else{
						res.status(201).send({
							message : "success siggin",
							token : token
						});
					}
				}else{
					console.log("hashedpw : " + hashedpw.toString('base64'));
					console.log("user_pw : " + checkResult[0].sup_pw);
					res.status(400).send({
						message:"fail signin from client, login failed"
					});
				}
			}else{
				res.status(400).send({
					message:"incorrect information"
				});
			}
		}
	}
});

module.exports = router;
