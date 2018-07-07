const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');

router.post('/',async(req,res)=>{
  let user_pw = req.body.user_pw;
  let user_pw_check = req.body.user_pw_check;
  let user_name = req.body.user_name;
  let user_email = req.body.user_email;
  let user_phone = req.body.user_phone;
  let user_id = req.body.user_id;


  let insertQuery;
  let insertResult;

  console.log(user_pw);
  console.log(user_pw_check);
  console.log(user_name);
  console.log(user_email);
  console.log(user_phone);
  console.log(user_id);
  if(!user_pw || !user_pw_check || !user_name || !user_email || !user_phone){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else if(user_pw === user_pw_check) {
    let checkQuery = 'SELECT * FROM user WHERE user_email =?';
    let checkResult = await db.queryParam_Arr(checkQuery,[user_email]);
    let checkPhoneQuery = 'SELECT * FROM user WHERE user_phone =?';
    let checkPhoneResult = await db.queryParam_Arr(checkPhoneQuery,[user_phone]);

    if(!checkResult){
      res.status(500).send({
        message:"fail signup from server"
      });
    }else if(checkResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same user_email"
      });
    }else if(checkPhoneResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same user_phone"
      });
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
      }else{
        res.status(201).send({
          message:"success signup",
          identify:"0"
        });
      }
    }
  }else {
    res.status(400).send({
      message:"Passwords are not the same"
    });
  }
});

module.exports = router;