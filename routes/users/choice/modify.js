const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.get('/', (req, res, next) => {
    res.render('index', { title: 'users/modify' });
});
router.delete('/', async (req, res, next) => {
    let token = req.headers.token;
    console.log(token);

    if(!token){
        res.status(500).send({
            message: "Token Error"
        });
    }else{
        let decoded = jwt.verify(token); 
        console.log(decoded);

        if(decoded === -1){
            res.status(500).send({
                message : "Token Error"
            })
          }else {
            let user_idx = req.body.user_idx;
            console.log (user_idx);

            if(!user_idx){
              res.status(400).send({
                message : "Null Value"
              })
            }else {
              let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
              let select_idxResult = await db.queryParamArr(select_idxQuery,[decoded.email]); 
              let user_idx = select_idxResult[0].user_idx;
              let deleteQuery = "DELETE FROM interest WHERE user_idx= ?";
              let deleteResult = await db.queryParamArr(deleteQuery,[user_idx]);
              if(!deleteResult){
                res.status(500).send({
                  message: "Internal server error"
                })
              }else{
                res.status(200).send({
                  message: "Success to delete data"
              })
            }
          }
        }}
      });

router.post('/', async (req, res, next) => {
  let token = req.headers.token;
  console.log(token);
  if (!token) {
    res.status(500).send({
      message: "Token Error"
    });
  }else{
     let decoded = jwt.verify(token);  
      console.log(decoded);
       if ( decoded === -1) {
         res.status(500).send({
           message: "Token Error"
           })
          }else {
            let user_interest = req.body.pro_cate;
            let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            let select_idxResult = await db.queryParamArr(select_idxQuery,[decoded.email]); 
            let user_idx = select_idxResult[0].user_idx;
            let insertQuery = "INSERT INTO interest (user_interest,user_idx) VALUES (?,?)";
            for(let i = 0 ; i < user_interest.length; i++){
                let insertResult = await db.queryParamArr(insertQuery, [user_interest[i],user_idx]);
            }
            if(!insertQuery){
                res.status (500).send({
                    message : "Internal server error"
                })
            }else if(user_interest.length <3){
                res.status(400).send({
                    message: "lack of information"
                })
            }else {
                res.status(200).send({
                    message : "Success to add"
                })
            }
        }
    }
});
        
module.exports = router;
