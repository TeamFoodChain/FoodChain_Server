const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.post('/',async(req,res)=>{
  let sup_name = req.body.sup_name;
  let sup_email = req.body.sup_email;
  let sup_phone = req.body.sup_phone;
  sup_phone = sup_phone.replace(/\-/g,'');
  let sup_regist_num = req.body.sup_regist_num;
  let sup_pw = req.body.sup_pw;
  let sup_id = req.body.sup_id;
  let mar_name = req.body.mar_name;
  let mar_locate_lat = req.body.mar_locate_lat;
  let mar_locate_long = req.body.mar_locate_long;
  let mar_addr = req.body.mar_addr;

  let mar_idx;
  let insertQuery;
  let insertResult;
	let token;

  if(!sup_name || !sup_email || !sup_phone || !sup_regist_num || !sup_pw || !mar_name || !mar_locate_lat || !mar_locate_long || !mar_addr){
    res.status(400).send(
      {
        message:"Null Value"
      }
    );
    return ;
  }else{
     // 카카오톡 이용 시
    if(sup_id){
      // 유저 테이블 search
      let idCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_id = ?) AS SUCCESS';
      let idResult = await db.queryParam_Arr(idCheckQuery, sup_id);
      if(idResult[0].SUCCESS){
        res.status(400).send({
          message : "Already Exist"
        });
      }
      // 공급자 테이블 search
      idCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_id = ?) AS SUCCESS';
      idResult = await db.queryParam_Arr(idCheckQuery, sup_id);
      if(idResult[0].SUCCESS){
        res.status(400).send({
          message : "Already Exist"
        });
      }
    }
    // 유저 테이블 search
    let emailCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_email = ?) AS SUCCESS';
    let phoneCheckQuery = 'SELECT EXISTS (SELECT * FROM user WHERE user_phone = ?) AS SUCCESS';
    let emailResult = await db.queryParam_Arr(emailCheckQuery, sup_email);
    let phoneResult = await db.queryParam_Arr(phoneCheckQuery, sup_phone);
    if(emailResult[0].SUCCESS || phoneResult[0].SUCCESS){
      res.status(400).send({
        message : "Already Exist"
      });
      return;
    }

    // 공급자 테이블 search
    emailCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_email = ?) AS SUCCESS';
    phoneCheckQuery = 'SELECT EXISTS (SELECT * FROM supplier WHERE sup_phone = ?) AS SUCCESS';
    emailResult = await db.queryParam_Arr(emailCheckQuery, sup_email);
    phoneResult = await db.queryParam_Arr(phoneCheckQuery, sup_phone);
    if(emailResult[0].SUCCESS || phoneResult[0].SUCCESS){
      res.status(400).send({
        message : "Already Exist"
      });
      return;
    }


    let insertMarketQuery = 'INSERT INTO market (mar_name,mar_locate_lat,mar_locate_long,mar_addr) VALUES (?,?,?,?)';
    let insertMarketResult = await db.queryParam_Arr(insertMarketQuery,[mar_name,mar_locate_lat,mar_locate_long,mar_addr]);
    
    if(!insertMarketResult){
      res.status(500).send({
        message : "Internal Server Error"
      });
      console.log("fail from server - insert into market error");
      return ;
    }else{
      mar_idx = insertMarketResult.insertId;

      const salt = await crypto.randomBytes(32);
      const hashedpw = await crypto.pbkdf2(sup_pw,salt.toString('base64'),100000,32,'sha512');

      if(!sup_id){
        insertQuery = 'INSERT INTO supplier (sup_name,sup_email,sup_phone,sup_regist_num,sup_pw,sup_pw_salt,mar_idx) VALUES (?,?,?,?,?,?,?)';
        insertResult = await db.queryParam_Arr(insertQuery,[sup_name,sup_email,sup_phone,sup_regist_num,hashedpw.toString('base64'),salt.toString('base64'),mar_idx]);
      } else {
        insertQuery = 'INSERT INTO supplier (sup_name,sup_email,sup_phone,sup_regist_num,sup_id,sup_pw,sup_pw_salt,mar_idx) VALUES (?,?,?,?,?,?,?,?)';
        insertResult = await db.queryParam_Arr(insertQuery,[sup_name,sup_email,sup_phone,sup_regist_num,sup_id,hashedpw.toString('base64'),salt.toString('base64'),mar_idx]);
      }
      if(!insertResult){
        res.status(500).send({
          message:"Internal Server Error",
          data:sup_name, sup_email, sup_phone, sup_regist_num, sup_id, mar_idx
        });
        return ;
        console.log("fail from server - insert into supplier error");
      }else{
        let insertFridgeQuery = "INSERT INTO fridge (sup_idx) VALUES(?)"
        let result = await db.queryParam_Arr(insertFridgeQuery, insertResult.insertId);

        token = jwt.sign(sup_email, sup_pw, 1);
        if(!token){
          res.status(500).send({
            message:"Internal Server Error"
          });
          console.log("Token Error : ", token);
        }else{
          insertQuery = "UPDATE supplier SET sup_token = ? WHERE sup_idx = ?";
          insertResult1 = await db.queryParam_Arr(insertQuery, [token, insertResult.insertId]);
          if(!insertResult1){
            res.status(500).send({
              message:"Internal Server Error"
            });
            return ;
          } else {
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
  }
});

module.exports = router;