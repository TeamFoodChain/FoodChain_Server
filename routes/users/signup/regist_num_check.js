const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');

router.post('/',async(req,res)=>{
  let sup_regist_num = req.body.sup_regist_num;

  if(!sup_regist_num){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else{
    let checkQuery = 'SELECT * FROM supplier WHERE sup_regist_num =?';
    let checkResult = await db.queryParam_Arr(checkQuery,[sup_regist_num]);

    if(!checkResult){
      res.status(500).send({
        message:"fail signup from server"
  	  });
    }else if (checkResult.length === 1){
      res.status(400).send({
        message:"fail sign up from client, Already exists. - same sup_regist_num"
      });
    }else{
      res.status(201).send({
         message:"success sup_regist_num check"
      });
    }
  }
});

module.exports = router;