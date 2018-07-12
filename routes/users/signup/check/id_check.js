const express = require('express');
const router = express.Router();
const db = require('../../../../module/pool.js');

router.post('/',async(req,res)=>{
  let id = req.body.id;
  
  if(!id){
    res.status(400).send(
      {
        message:"Null Value"
      }
    );
  }else{

      let checkUserQuery = 'SELECT * FROM user WHERE user_id =?';
      let checkUserResult = await db.queryParam_Arr(checkUserQuery,[id]);
      let checkSupplierQuery = 'SELECT * FROM supplier WHERE sup_id =?';
      let checkSupplierResult = await db.queryParam_Arr(checkSupplierQuery,[id]);

      if(!checkUserResult || !checkSupplierResult){
        res.status(500).send({
          message:"Internal Server Error"
        });
      }else if (checkUserResult.length === 1 || checkSupplierResult.length === 1){
        res.status(400).send({
          message:"This Id Already Exists."
        });
      }else{
        res.status(200).send({
          message:"Success Id Check"
        });
      }
  }
});

module.exports = router;