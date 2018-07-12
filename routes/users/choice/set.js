const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.post('/', async function(req, res) {
    let token = req.headers.token;
    let interest = req.body.pro_cate;

    let decoded = jwt.verify(token);

    let select_idxQuery;
    let select_idxResult;
    let insertQuery;
    let insertResult;

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal Server Error"
        });
        console.log(decoded);
        console.log(token);
    }else{
        if(decoded.identify ==0){
            select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let user_idx = select_idxResult[0].user_idx;
            insertQuery = "INSERT INTO interest (interest, user_idx) VALUES (?,?)";
            for(let i = 0 ; i < interest.length; i++){
                insertResult = await db.queryParam_Arr(insertQuery, [interest[i],user_idx]);
                }
        }else{
            select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            insertQuery = "INSERT INTO interest (interest,sup_idx) VALUES (?,?)";
            for(let i = 0 ; i < interest.length; i++){
                insertResult = await db.queryParam_Arr(insertQuery, [interest[i],sup_idx]);
            }
        }
        if(!insertResult){ 
            res.status (500).send({
                message : "Internal Server Error"
            });
        }else if(interest.length <3){
            res.status(400).send({
                message: "Lack of Information"
            });
        }else {
            res.status(200).send({
                message : "Success to Register"
            });
        }
    }
});
module.exports = router;