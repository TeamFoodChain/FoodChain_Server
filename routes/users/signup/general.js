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
  user_phone = user_phone.replace(/\-/g,'');
  let user_id = req.body.user_id;

  let insertQuery;
  let insertResult;
	let token;

  if(!user_pw || !user_name || !user_email || !user_phone){
    res.status(400).send(
      {
        message : "Null Value"
      }
    );
    return ;
  }else{
    // 카카오톡 이용 시
    if(user_id){
      // 유저 테이블 search
      let idCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_id = ?) AS SUCCESS';
      let idResult = await db.queryParam_Arr(idCheckQuery, user_id);
      if(idResult[0].SUCCESS){
        res.status(400).send({
          message : "Already Exist"
        });
      }
      // 공급자 테이블 search
      idCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_id = ?) AS SUCCESS';
      idResult = await db.queryParam_Arr(idCheckQuery, user_id);
      if(idResult[0].SUCCESS){
        res.status(400).send({
          message : "Already Exist"
        });
      }
    }
    // 유저 테이블 search
    let emailCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_email = ?) AS SUCCESS';
    let phoneCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_phone = ?) AS SUCCESS';
    let emailResult = await db.queryParam_Arr(emailCheckQuery, user_email);
    let phoneResult = await db.queryParam_Arr(phoneCheckQuery, user_phone);
    if(emailResult[0].SUCCESS || phoneResult[0].SUCCESS){
      res.status(400).send({
        message : "Already Exist"
      });
      return;
    }

    // 공급자 테이블 search
    emailCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_email = ?) AS SUCCESS';
    phoneCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_phone = ?) AS SUCCESS';
    emailResult = await db.queryParam_Arr(emailCheckQuery, user_email);
    phoneResult = await db.queryParam_Arr(phoneCheckQuery, user_phone);
    if(emailResult[0].SUCCESS || phoneResult[0].SUCCESS){
      res.status(400).send({
        message : "Already Exist"
      });
      return;
    }


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
        message:"Internal Server Error"
      });
    }else{
      let insertFridgeQuery = "INSERT INTO fridge (user_idx) VALUES(?)"
      let result = await db.queryParam_Arr(insertFridgeQuery, insertResult.insertId);

      if(!result){
        res.status(500).send({
          message:"Internal Server Error"
        });
        console.log("Insert Error : ", result);
      }

      token = jwt.sign(user_email, user_pw, 0);

      if(!token){
        res.status(500).send({
          message:"Internal Server Error"
        });
        console.log("Token Error : ", token);
        return ;
      }else{
        insertQuery = "UPDATE user SET user_token = ? WHERE user_idx = ?";
        insertResult1 = await db.queryParam_Arr(insertQuery, [token, insertResult.insertId]);
        
        if(!insertResult1){
          res.status(500).send({
            message:"Internal Server Error"
          });
          return ;
        } else{
          res.status(200).send({
            message : "Success Signup",
            token : token,
            cate_flag : 0,
            locate_flag : 0
          });
          return ;
        }
      }
    }
  }
});

module.exports = router;