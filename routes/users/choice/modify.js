const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

//1. 관심상품 수정 (기존 값 삭제 -> 새로 받음)
router.put('/', async (req, res, next) => {
  let token = req.headers.token;
  let decoded = jwt.verify(token);
  let interest = req.body.pro_cate;

  let select_idxQuery;
  let select_idxResult;
  let deleteQuery;
  let deleteResult;
  let insertQuery;
  let insertResult;
    console.log(decoded);
  if(decoded == -1) {                  
        res.status (500).send({
            message : "Internal server error"
        });
    }else{
        if(decoded.identify == 0){                                        //일반 사용자
            select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";             
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let user_idx = select_idxResult[0].user_idx;
            if(!select_idxResult){
                res.status(500).send({
                    message: "Internal server error"
                });

            }else{
                deleteQuery = "DELETE interest FROM interest WHERE user_idx= ?";
                deleteResult = await db.queryParam_Arr(deleteQuery,[user_idx]);
                if(!deleteResult){
                    res.status(500).send({
                        message: "Internal server error"
                    });
                }else{
                    insertQuery = "INSERT INTO interest (interest,user_idx) VALUES (?,?)";
                    for(let i = 0 ; i < interest.length; i++){
                        insertResult = await db.queryParam_Arr(insertQuery, [interest[i], user_idx]);}
                }}
            }else{   
            select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?"
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            if(!select_idxResult){
                res.status(500).send({
                    message: "Internal server error"
                });
            }else{
                deleteQuery = "DELETE FROM interest WHERE sup_idx= ?";
                deleteResult = await db.queryParam_Arr(deleteQuery,[sup_idx]);
                console.log("1",deleteResult);
                if(!deleteResult){
                    res.status(500).send({
                        message: "Internal server error"
                    });
                }else{
                    select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
                    select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
                    let sup_idx = select_idxResult[0].sup_idx;
                    insertQuery = "INSERT INTO interest (interest,user_idx) VALUES (?,?)";
                    for(let i = 0 ; i < interest.length; i++){
                        insertResult = await db.queryParam_Arr(insertQuery, [interest[i], sup_idx]);}
                }}}             
                if(!insertResult){
                    res.status (500).send({
                        message : "Internal server error"
                    });
                }else if(interest.length <3){
                    res.status(400).send({
                        message: "lack of information"
                    });
                }else{
                    res.status(200).send({
                        message : "Success to modify"
            });
        }
    }
});
        
module.exports = router;