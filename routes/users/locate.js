const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');
const pool = require('../../config/dbPool.js');
const async = require('async');
const identifier = require('../../module/token_identifier.js');

router.post('/', async function(req, res, next) {
    let token = req.headers.token;
    let decoded = jwt.verify(token);

    let select_idxQuery;
    let select_idxResult;
    let insertQuery;
    let insertResult;

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal Server Error"
        });
    }else{
        if(decoded.identify ==0){
            let user_addr = req.body.locate_addr;
            let user_addr_lat = req.body.locate_lat;
            let user_addr_long = req.body.locate_long;
            if (!user_addr || !user_addr_lat || !user_addr_long){ 
                res.status(400).send({                             //data 값이 하나라도 없는 경우
                    message: "Null Value"
                });
                return;
            }else {
                select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
                select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
                let user_idx = select_idxResult[0].user_idx;
                insertQuery = "UPDATE user SET user_addr = ?, user_addr_lat = ?, user_addr_long = ? WHERE user_idx= ?";
                insertResult = await db.queryParam_Arr(insertQuery,[user_addr, user_addr_lat, user_addr_long, user_idx])};
        } else{
            let sup_addr = req.body.locate_addr;
            let sup_addr_lat = req.body.locate_lat;
            let sup_addr_long = req.body.locate_long;  
            if (!sup_addr || !sup_addr_lat || !sup_addr_long){ 
            res.status(400).send({                             //data 값이 하나라도 없는 경우
                message: "Null Value"
            });
            return;
            }else {
                select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
                select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
                console.log(select_idxResult);
                let sup_idx = select_idxResult[0].sup_idx;
                insertQuery = "UPDATE supplier SET sup_addr = ?, sup_addr_lat = ?, sup_addr_long = ? WHERE sup_idx= ?";
                insertResult = await db.queryParam_Arr(insertQuery,[sup_addr, sup_addr_lat, sup_addr_long, sup_idx])
            }
        }
         if(!insertResult){
                    res.status(500).send({
                      message : "Internal Server Error"
                     });
                 }else{
                    res.status(200).send({
                      message: "Success to Register the Address"
                     });
                 }
}
});

router.put('/', async function(req, res, next){
    let addr = req.body.locate_addr;
    let addr_lat = req.body.locate_lat;
    let addr_long = req.body.locate_long;

    if(!addr || !addr_lat || !addr_long){
        res.status(400).send({
            message : "Null Value"
        });
        return ;
    }

    let token = req.headers.token;

    let taskArray = [
        // 1. token 유효성 검사, 해당 토큰에 대한 정보 반환
        function(callback){
            return new Promise((resolve, reject)=>{
                identifier(token, function(err, result){
                    if(err) reject(err);
                    else resolve(result);
                });
            }).then(function(identify_data){
                callback(null, identify_data);
            }).catch(function(err){
                res.status(500).send({
                    message : err
                });
                return ;
                console.log(err);
            });
        },
        // 2. pool에서 connection 하나 가져오기
        function(identify_data, callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    res.status(500).send({
                        message: "Internal Server Error"
                    }); 
                    callback("pool.getConnection Error : " + err);
                } else {
                    callback(null, connection, identify_data);
                }
            });
        }, 
        
        // 3. idx값을 확인하여 주소값 수정
        function(connection, identify_data, callback){
            let updateLocateQuery = ""
            if(identify_data.identify == 0)
                updateLocateQuery = "UPDATE user SET user_addr =?, user_addr_lat = ?, user_addr_long = ? WHERE user_idx = ?";
             else
                updateLocateQuery = "UPDATE supplier SET sup_addr =?, sup_addr_lat = ?, sup_addr_long = ? WHERE sup_idx = ?";
                       
            connection.query(updateLocateQuery, [addr, addr_lat, addr_long, identify_data.idx], function(err, result){
                if(err) {
                    res.status(500).send({
                        message : "Internal Server Error"
                    });
                    callback("connection.query Error : " + err);
                } 
                callback(null, "Success to Modify Address"); 
                connection.release();
            });
        }
    ];

    async.waterfall(taskArray, function(err, result){
            if(err){
                console.log(err);
            } else {
                res.status(200).send({
                        message : result,
                    });
                console.log(result);
            }
        });

});


module.exports = router;
