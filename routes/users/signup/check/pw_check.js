const express = require('express');
const router = express.Router();

router.post('/',async(req,res)=>{
  let pw = req.body.pw;
  let pw_check = req.body.pw_check;

  if(!pw || !pw_check){
    res.status(400).send(
      {
        message:"Null Value"
      }
    );
  }else{   
    let regExp = /^[a-z0-9_]{4,20}$/;

    if ((!regExp.test(pw)) || (!regExp.test(pw_check))){
      res.status(400).send(
        {
          message:"Invalid data"
        }
      );
    }else{
      if (pw === pw_check){
        res.status(200).send({
          message:"Success password check"
        });
      }else{
        res.status(400).send({
          message:"Password is not matching."
        });
      }
    }
  }
});

module.exports = router;