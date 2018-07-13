const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const pool_async = require('../../config/dbPool_async.js');
const async = require('async');
const jwt = require('../../module/jwt.js');
const identifier = require('../../module/token_identifier.js');
 
router.get('/',async (req,res)=> { 
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
            (async function(){
                let connection = await pool_async.getConnection();
                if (!connection) {
                    res.status(500).send({
                        message: "Internal Server Error"
                    }); 
                    connection.release();
                    callback("pool.getConnection Error : " + err);
                    return ;
                } else {
                    callback(null, connection, identify_data);
                }

            })();
        },

        function(connection, identify_data, callback){
            let data = {};
            (async function(){
                if(identify_data.identify == 0){
                    let selectQuery = "SELECT user_name, user_img, user_point FROM user WHERE user_email = ?";
                    let selectResult1 = await connection.query(selectQuery, [identify_data.email]);
                    if(!selectResult1){
                        res.status(500).send({
                            message : "Internal Server Error"
                        });
                        callback("Internal Server Error");
                        connection.release();
                        return ;
                    } else{
                        selectQuery = "SELECT count(coupon_idx) as coupon_count FROM user_coupon WHERE user_idx = ?";
                        selectResult2 = await connection.query(selectQuery, [identify_data.user_idx]);

                        if(!selectResult2){
                           res.status(500).send({
                             message : "Internal Server Error"
                         });
                           callback("Internal Server Error");
                           connection.release();
                           return ;
                       } else{
                        let a = selectResult1[0];
                        let b = selectResult2[0];
                        data.user_name = a[0].user_name;
                        data.user_img = a[0].user_img;
                        data.user_point = a[0].user_point;
                        data.user_coupon = b[0].coupon_count;
                        console.log(selectResult1[0]);
                        res.status(200).send({
                            message : "Success to Get Data",
                            data : data
                        })
                        callback("Success to Get Data");
                        connection.release();
                        return ;
                    }
                }


            }else {
                let selectQuery = "SELECT sup_name, sup_img, sup_point FROM supplier WHERE sup_email = ?";
                let selectResult1 = await connection.query(selectQuery, [identify_data.email]);
                if(!selectResult1){
                    res.status(500).send({
                        message : "Internal Server Error"
                    });
                    callback("Internal Server Error");
                    connection.release();
                    return ;
                } else{
                    selectQuery = "SELECT count(coupon_idx) as coupon_count FROM user_coupon WHERE sup_idx = ?";
                    selectResult2 = await connection.query(selectQuery, [identify_data.user_idx]);
                    if(!selectResult2){
                       res.status(500).send({
                         message : "Internal Server Error"
                     });
                       callback("Internal Server Error");
                       connection.release();
                       return ;
                   } else{
                    let a = selectResult1[0];
                    let b = selectResult2[0];
                    data.user_name = a[0].sup_name;
                    data.user_img = a[0].sup_img;
                    data.user_point = a[0].sup_point;
                    data.user_coupon = b[0].coupon_count;
                    res.status(200).send({
                        message : "Success to Get Data",
                        data : data
                    })
                    callback("Success to Get Data");
                    connection.release();
                    return ;
                }
            }
        }


    })();
}



        ];

    async.waterfall(taskArray, function(err, result){
            if(err){
                console.log(err);
            } else {
                res.status(200).send({
                    message : "Success to Get Data"
                });
            }
        });
});

module.exports = router;