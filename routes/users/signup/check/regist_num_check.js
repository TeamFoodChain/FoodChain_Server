const express = require('express');
const router = express.Router();
const db = require('../../../../module/pool.js');

router.post('/',async(req,res)=>{
  let sup_regist_num = req.body.sup_regist_num;

  if(!sup_regist_num){
    res.status(400).send(
      {
        message:"Null Value"
      }
    );
  }else{   
    let regExp = /^[0-9]+$/;

    if (!regExp.test(sup_regist_num)){
      res.status(400).send(
        {
          message:"Invalid Data"
        }
      );
    }else{
      let checkQuery = 'SELECT * FROM supplier WHERE sup_regist_num =?';
      let checkResult = await db.queryParam_Arr(checkQuery,[sup_regist_num]);

      if(!checkResult){
        res.status(500).send({
          message:"Internal Server Error"
        });
      }else if (checkResult.length === 1){
        res.status(400).send({
          message:"This Sup_regist_num Already Exists."
        });
      }else{
        res.status(200).send({
          message:"Success Sup_regist_num Check"
        });
      }
    }
  }
});

module.exports = router;