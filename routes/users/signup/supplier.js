const express = require('express');
const router = express.Router();
const crypto = require('crypto-promise');
const db = require('../../../module/pool.js');

router.post('/',async(req,res)=>{
  let sup_name = req.body.sup_name;
  let sup_email = req.body.sup_email;
  let sup_phone = req.body.sup_phone;
  let sup_regist_num = req.body.sup_regist_num;
  let sup_pw = req.body.sup_pw;
  let sup_pw_check = req.body.sup_pw_check;
  let sup_id = req.body.sup_id;
  let mar_name = req.body.mar_name;
  let mar_locate_lat = req.body.mar_locate_lat;
  let mar_locate_long = req.body.mar_locate_long;
  let mar_addr = req.body.mar_addr;

  let mar_idx;
  let insertQuery;
  let insertResult;

  if(!sup_name || !sup_email || !sup_phone || !sup_regist_num || !sup_pw || !sup_pw_check || !mar_name || !mar_locate_lat || !mar_locate_long || !mar_addr){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else if(sup_pw === sup_pw_check) {
    let checkQuery = 'SELECT * FROM supplier WHERE sup_regist_num = ?';
    let checkResult = await db.queryParam_Arr(checkQuery,[sup_regist_num]);
    let checkEmailQuery = 'SELECT * FROM supplier WHERE sup_email = ?';
    let checkEmailResult = await db.queryParam_Arr(checkEmailQuery,[sup_email]);
    let checkPhoneQuery = 'SELECT * FROM supplier WHERE sup_phone = ?';
    let checkPhoneResult = await db.queryParam_Arr(checkPhoneQuery,[sup_phone]);

    if(!checkResult){
      res.status(500).send({
        message:"fail signup from server"
      });
    }else if(checkResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same sup_regist_num"
      });
    }else if(checkEmailResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same sup_email"
      });
    }else if(checkPhoneResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same sup_phone"
      });
    }else{
        let insertMarketQuery = 'INSERT INTO market (mar_name,mar_locate_lat,mar_locate_long,mar_addr) VALUES (?,?,?,?)';
        let insertMarketResult = await db.queryParam_Arr(insertMarketQuery,[mar_name,mar_locate_lat,mar_locate_long,mar_addr]);
        
        if(!insertMarketResult){
          res.status(500).send({
            message:"fail from server - insert into market error"
          });
        }else{
          let selectQuery = 'SELECT mar_idx FROM market WHERE mar_name = ? && mar_locate_lat = ? && mar_locate_long = ? && mar_addr = ?';
          let selectResult = await db.queryParam_Arr(selectQuery,[mar_name,mar_locate_lat,mar_locate_long,mar_addr]);
          mar_idx = selectResult[0].mar_idx;
          
          if (!selectResult) {
            res.status(500).send({
              message:"fail from server - get market_idx error"
            });
          }else{
            const salt = await crypto.randomBytes(32);
            const hashedpw = await crypto.pbkdf2(sup_pw,salt.toString('base64'),100000,32,'sha512');

            if(!sup_id){
              insertQuery = 'INSERT INTO supplier (sup_name,sup_email,sup_phone,sup_regist_num,sup_pw,sup_pw_salt,mar_idx) VALUES (?,?,?,?,?,?,?)';
              insertResult = await db.queryParam_Arr(insertQuery,[sup_name,sup_email,sup_phone,sup_regist_num,hashedpw.toString('base64'),salt.toString('base64'),selectResult[0].mar_idx]);
            } else {
              insertQuery = 'INSERT INTO supplier (sup_name,sup_email,sup_phone,sup_regist_num,sup_id,sup_pw,sup_pw_salt,mar_idx) VALUES (?,?,?,?,?,?,?,?)';
              insertResult = await db.queryParam_Arr(insertQuery,[sup_name,sup_email,sup_phone,sup_regist_num,sup_id,hashedpw.toString('base64'),salt.toString('base64'),selectResult[0].mar_idx]);
            }
            if(!insertResult){
              res.status(500).send({
                message:"fail from server - insert into supplier error",
                data:sup_name, sup_email, sup_phone, sup_regist_num, sup_id, mar_idx
              });
            }else{
              res.status(201).send({
                message:"success signup",
                identify:"1"
              });
            }
          }
        }
      }
    }else{
      res.status(400).send({
        message:"incorrect password"
      });
    }
  });



module.exports = router;