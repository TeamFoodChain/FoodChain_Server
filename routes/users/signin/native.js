const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.post('/',async(req, res) =>{
	let user_id = req.body.user_id;
	let user_pw = req.body.user_pw;
	
	let token;
	let checkQuery;
	let checkResult;

	let cate_flag;
	let locate_flag;

	if (!user_id || !user_pw) {
		res.status(400).send({
			message : "Null Value"
		});
		return ;
	}


	// user table
	if (user_id.indexOf("@") != -1) {
		let regExp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
		if (!regExp.test(user_id)){
		  res.status(400).send(
			{
			  message : "Invalid Data"
			}
		  );
		}else{
			checkQuery = 'SELECT * FROM user WHERE user_email = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
		}
	}else{
		let regExp = /^([0-9]{2,3})-?([0-9]{3,4})-?([0-9]{4})$/;
		if (!regExp.test(user_id)){
		  res.status(400).send(
			{
			  message:"Invalid Data"
			}
		  );
		}else{
			user_id = user_id.replace(/\-/g,'');
			checkQuery = 'SELECT * FROM user WHERE user_phone = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
		}
	}

	if (!checkResult) {												
		res.status(500).send({
			message : "Internal Server Error"
		});
		return ;
	}else if(checkResult.length === 1){ // user_id에 해당하는 row가 있을 때 
		let hashedpw = await crypto.pbkdf2(user_pw,checkResult[0].user_salt, 100000,32,'sha512');

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
				if(checkResult2.user_addr == null){
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
		} else{
			res.status(400).send({
				message:"Wrong Password"
			});
			return ;
		}
	}else{
		res.status(400).send({
			message:"Incorrect Information"
		});
		return ;
	}


	// supplier table
	if (user_id.indexOf("@") != -1) {
		let regExp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
		if (!regExp.test(user_id)){
		  res.status(400).send(
			{
			  message : "Invalid Data"
			}
		  );
		}else{
			checkQuery = 'SELECT * FROM supplier WHERE sup_email = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
		}
	}else{
		let regExp = /^([0-9]{2,3})-?([0-9]{3,4})-?([0-9]{4})$/;
		if (!regExp.test(user_id)){
		  res.status(400).send(
			{
			  message:"Invalid Data"
			}
		  );
		}else{
			user_id = user_id.replace(/\-/g,'');
			checkQuery = 'SELECT * FROM supplier WHERE sup_phone = ?';
			checkResult = await db.queryParam_Arr(checkQuery, [user_id]);
		}
	}

	if (!checkResult) {												
		res.status(500).send({
			message : "Internal Server Error"
		});
		return ;
	}else if(checkResult.length === 1) { // user_id에 해당하는 row가 있을 때 
		let hashedpw = await crypto.pbkdf2(user_pw,checkResult[0].sup_pw_salt, 100000,32,'sha512');

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
				if(checkResult2.sup_addr == null){
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
				message:"Wrong Password"
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
