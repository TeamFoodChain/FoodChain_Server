const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.post('/',async(req, res) =>{
	let id = req.body.id;
	
	let token = req.headers.token;
	let checkQuery;
	let checkResult;
	
	let cate_flag;
	let locate_flag;

	if (!id) {
		res.status(400).send({
			message : "Null Value"
		});
		return ;
	}


			checkQuery = 'SELECT * FROM user WHERE user_id = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [id]);
			if (!checkResult) {
				res.status(500).send({
					message : "Internal Server Error"
				});
				return ;
			}else if(checkResult.length === 1){ // user_id에 해당하는 row가 있을 때 
				let hashedpw = await crypto.pbkdf2(id,checkResult[0].user_salt, 100000,32,'sha512');
	
				if(hashedpw.toString('base64') === checkResult[0].user_pw){
					token = jwt.sign(checkResult[0].user_email, checkResult[0].user_pw, 0);
					insertQuery = 'UPDATE user SET user_token = ? WHERE user_idx = ?';
					insertResult = await db.queryParam_Arr(insertQuery, [token, checkResult[0].user_idx]);
					if (!insertResult) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						console.log("Insert Token Fail");
						return ;
					}else{
						checkQuery = "SELECT interest FROM interest WHERE user_idx = ?";
						checkResult1 = await db.queryParam_Arr(checkQuery, [checkResult[0].user_idx]);
						if(checkResult1 == "" || checkResult1 == null || checkResult1 == undefined || ( checkResult1 != null && typeof checkResult1 == "object" && !Object.keys(checkResult1).length)){
							cate_flag = 0;
						}else{
							cate_flag = 1;
						}

						checkQuery = "SELECT user_addr FROM user WHERE user_idx = ?";
						checkResult2 = await db.queryParam_Arr(checkQuery, [checkResult[0].user_idx]);					
						if(checkResult2[0].user_addr == null){
							locate_flag = 0;
						} else{
							locate_flag = 1;
						}
						res.status(201).send({
							message : "Success Signin",
							token : token,
							identify : 0,
							cate_flag : cate_flag,
							locate_flag : locate_flag
						});
						return;
					}
				}else{
					res.status(400).send({
						message:"Wrong Id"
					});
					return ;
				}
			}


			checkQuery = 'SELECT * FROM supplier WHERE sup_id = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [id]);

			if (!checkResult) {												
				res.status(500).send({
					message : "Internal Server Error"
				});
				return ;
			}else if(checkResult.length === 1) {// user_id에 해당하는 row가 있을 때 
				let hashedpw = await crypto.pbkdf2(id,checkResult[0].sup_pw_salt, 100000,32,'sha512');
	
				if(hashedpw.toString('base64') === checkResult[0].sup_pw){
					token = jwt.sign(checkResult[0].sup_email, checkResult[0].sup_pw, 1);
					insertQuery = 'UPDATE supplier SET sup_token = ? WHERE sup_idx = ?';
					insertResult = await db.queryParam_Arr(insertQuery, [token, checkResult[0].sup_idx]);
					if (!insertResult) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						console.log("Insert Token Fail");
						return ;
					}else{
						checkQuery = "SELECT interest FROM interest WHERE sup_idx = ?";
						checkResult1 = await db.queryParam_Arr(checkQuery, [checkResult[0].sup_idx]);
						if(checkResult1 == "" || checkResult1 == null || checkResult1 == undefined || ( checkResult1 != null && typeof checkResult1 == "object" && !Object.keys(checkResult1).length)){
							cate_flag = 0;
						}else{
							cate_flag = 1;
						}

						checkQuery = "SELECT sup_addr FROM supplier WHERE sup_idx = ?";
						checkResult2 = await db.queryParam_Arr(checkQuery, [checkResult[0].sup_idx]);
						if(checkResult2[0].sup_addr == null){
							locate_flag = 0;
						} else{
							locate_flag = 1;
						}
						res.status(201).send({
							message : "Success Signin",
							token : token,
							identify : 1,
							cate_flag : cate_flag,
							locate_flag : locate_flag
						});
						return;
					}
				}else{
					res.status(400).send({
						message:"Wrong Id"
					});
					return ;
				}
			}else{
				res.status(400).send({
					message:"Incorrect Information"
				});
				return ;
			}

});

module.exports = router;
