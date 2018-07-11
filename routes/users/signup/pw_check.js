const express = require('express');
const router = express.Router();

router.post('/',async(req,res)=>{
  let pw = req.body.pw;
  let pw_check = req.body.pw_check;

  if(!pw || !pw_check){
    res.status(400).send(
      {
        message:"fail from client"
      }
    );
  }else{
    if (pw === pw_check){
      res.status(201).send({
         message:"success password check"
      });
    }else{
      res.status(500).send({
         message:"password is not matching."
      });
    }
  }
});

module.exports = router;