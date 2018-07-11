const express = require('express');
const router = express.Router();
const db = require('../../../../module/pool.js');

router.post('/',async(req,res)=>{
  let email = req.body.email;
  
  if(!email){
    res.status(400).send(
      {
        message:"Null Value"
      }
    );
  }else{
    let regExp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;

    if (!regExp.test(email)){
      res.status(400).send(
        {
          message:"Invalid data"
        }
      );
    }else{
      let checkUserQuery = 'SELECT * FROM user WHERE user_email =?';
      let checkUserResult = await db.queryParam_Arr(checkUserQuery,[email]);
      let checkSupplierQuery = 'SELECT * FROM supplier WHERE sup_email =?';
      let checkSupplierResult = await db.queryParam_Arr(checkSupplierQuery,[email]);

      if(!checkUserResult || !checkSupplierResult){
        res.status(500).send({
          message:"Internal Server Error"
        });
      }else if (checkUserResult.length === 1 || checkSupplierResult.length === 1){
        res.status(400).send({
          message:"This email already exists."
        });
      }else{
        res.status(200).send({
          message:"Success email check"
        });
      }
    }
  }
});

module.exports = router;