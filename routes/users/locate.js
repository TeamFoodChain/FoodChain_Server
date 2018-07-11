const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');

router.post('/', async function(req, res, next) {
    let token = req.headers.token;
    let decoded = jwt.verify(token);

    let select_idxQuery;
    let select_idxResult;
    let insertQuery;
    let insertResult;

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal server error"
        });
        console.log(decoded);
        console.log(token);
    }else{
        if(decoded.identify ==0){
            let user_addr = req.body.locate_name;
            let user_addr_lat = req.body.locate_lat;
            let user_addr_long = req.body.locate_long;
            if (!user_addr || !user_addr_lat || !user_addr_long){ 
                res.status(400).send({                             //data 값이 하나라도 없는 경우
                    message: "Null Value"
                });
            }else {
                select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
                select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
                let user_idx = select_idxResult[0].user_idx;
                insertQuery = "UPDATE user SET user_addr = ?, user_addr_lat = ?, user_addr_long = ? WHERE user_idx= ?";
                insertResult = await db.queryParam_Arr(insertQuery,[user_addr, user_addr_lat, user_addr_long, user_idx])};
        } else{
            let sup_addr = req.body.locate_name;
            let sup_addr_lat = req.body.locate_lat;
            let sup_addr_long = req.body.locate_long;  
        
            if (!sup_addr || !sup_addr_lat || !sup_addr_long){ 
            res.status(400).send({                             //data 값이 하나라도 없는 경우
                message: "Null Value"
            });
            }else {
                select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
                select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
                let sup_idx = select_idxResult[0].sup_idx;
                insertQuery = "UPDATE sup SET sup_addr = ?, sup_addr_lat = ?, sup_addr_long = ? WHERE sup_idx= ?";
                insertResult = await db.queryParam_Arr(insertQuery,[sup_addr, sup_addr_lat, sup_addr_long, sup_idx])
            }
        }
         if(!insertResult){
                    res.status(500).send({
                      message : "Internal Server Error"
                     });
                 }else{
                    res.status(200).send({
                      message: "Success to register the address"
                     });
                 }
}
});



module.exports = router;
