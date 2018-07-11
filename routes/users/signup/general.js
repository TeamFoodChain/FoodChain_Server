const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.post('/',async(req,res)=>{
  let user_pw = req.body.user_pw;
  let user_name = req.body.user_name;
  let user_email = req.body.user_email;
  let user_phone = req.body.user_phone;
  let user_id = req.body.user_id;

  let insertQuery;
  let insertResult;
	let token;

  if(!user_pw || !user_name || !user_email || !user_phone){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else{
    const salt = await crypto.randomBytes(32);
    const hashedpw = await crypto.pbkdf2(user_pw,salt.toString('base64'),100000,32,'sha512');

    if(!user_id){
      insertQuery = 'INSERT INTO user (user_pw,user_salt,user_name,user_email,user_phone) VALUES (?,?,?,?,?)';
      insertResult = await db.queryParam_Arr(insertQuery,[hashedpw.toString('base64'),salt.toString('base64'),user_name,user_email,user_phone]);
    } else {
      insertQuery = 'INSERT INTO user (user_pw,user_salt,user_name,user_email,user_phone,user_id) VALUES (?,?,?,?,?,?)';
      insertResult = await db.queryParam_Arr(insertQuery,[hashedpw.toString('base64'),salt.toString('base64'),user_name,user_email,user_phone,user_id]);
    }
    if(!insertResult){
      res.status(500).send({
        message:"fail from server"
      });
      console.log("insert query Error : ", insertResult);
    }else{
      token = jwt.sign(user_email, user_pw, 0);
      if(!token){
        res.status(500).send({
          message:"Internal Server Error"
        });
        console.log("Token Error : ", token);
      }else{
        res.status(200).send({
          message : "success signup",
          token : token,
          identify : 0,
          cate_flag : 0
        });
      }
    }
  }
});

module.exports = router;