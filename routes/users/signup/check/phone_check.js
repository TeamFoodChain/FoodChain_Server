const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');

router.post('/',async(req,res)=>{
  let phone = req.body.phone;

  if(!phone){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else{
    let checkUserQuery = 'SELECT * FROM user WHERE user_phone =?';
    let checkUserResult = await db.queryParam_Arr(checkUserQuery,[phone]);
    let checkSupplierQuery = 'SELECT * FROM supplier WHERE sup_phone =?';
    let checkSupplierResult = await db.queryParam_Arr(checkSupplierQuery,[phone]);

    if(!checkUserResult || !checkSupplierResult){
      res.status(500).send({
        message:"fail signup from server"
  	  });
    }else if (checkUserResult.length === 1 || checkSupplierResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same phone"
      });
    }else{
      res.status(201).send({
         message:"success phone check"
      });
    }
  }
});

module.exports = router;