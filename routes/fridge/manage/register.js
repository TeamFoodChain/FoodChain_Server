const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');			// queryParam_None, queryParam_Arr 두 개의 메소드
const jwt = require('../../../module/jwt.js');
const moment = require('moment');

router.post('/', async (req, res)=>{
    let fri_img = req.body.fri_img;
    let fri_cate = req.body.fri_cate;
    let fri_name = req.body.fri_name;
    let fri_ex_date = req.body.fri_ex_date;
    let fri_info = req.body.fri_info;
    let fri_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");
    let token = req.headers.token;
    let checkQuery;
    let checkResult;
    
    if( !fri_img || !fri_cate || !fri_name || !fri_ex_date || !fri_info || !token || !fri_regist_date){
        res.status(400).send({
            message : "Value Error : Fail from client"
        });
    }else{
        let decoded = jwt.verify(token);
        
        checkQuery = "SELECT user_idx FROM user WHERE user_email = ?";
        checkResult = await db.queryParam_Arr(checkQuery, [decoded.user_email]);

        let user_idx = checkResult[0].user_idx;

        if (!checkResult){
            res.status(500).send({
                message : "Internal server error"
            });
        }else if(decoded == -1){
            res.status(500).send({
                message : "token err"
            });
        }else{ 
            let registerQuery = "INSERT INTO fridge_item (fri_img, fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date) VALUES(?, ?, ?, ?, ?, ?)";
            let registerResult = await db.queryParam_Arr(registerQuery, [fri_img, fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date]);
            
            if (!registerResult){ 
                res.status(500).send({
                    message : "Register Error"
                });
            }else{
                let checkQuery = "SELECT fri_item_idx FROM fridge_item WHERE fri_img = ? && fri_cate = ? && fri_name = ? && fri_ex_date = ? && fri_info = ? && fri_regist_date = ?";
                let checkResult = await db.queryParam_Arr(checkQuery, [fri_img, fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date]);

                let fri_item_idx = checkResult[0].fri_item_idx;

                if (!checkResult){
                    res.status(500).send({
                        message : "fri_item_idx load Error"
                    });
                }else{
                    let selectQuery = "SELECT fri_item_idx FROM fridge WHERE fri_item_idx = ?"
                    let selectResult = await db.queryParam_Arr(selectQuery, [fri_item_idx]);

                    if (selectResult.length === 1) {
                        res.status(400).send({
                          message:"fri_item_idx is already exists"
                        });
                    } else {
                        let registerQuery = "INSERT INTO fridge (user_idx, fri_item_idx) VALUES (?, ?)";
                        let registerResult = await db.queryParam_Arr(registerQuery, [user_idx, fri_item_idx]);
                        
                        if (!registerResult){
                            res.status(400).send({
                                message : "fri_item_idx load Error"
                            });
                        }else{
                            res.status(200).send({
                                message : "Success to upload Data"
                            });
                        }
                    }
                }
            }
        }
    }
});

router.delete('/', async (req, res)=>{
    let fri_item_idx = req.body.fri_item_idx;
    let token = req.headers.token;
    let checkQuery;
    let checkResult;
    
    if( !fri_item_idx || !token) {
        res.status(400).send({
            message : "Value Error - Fail from client"
        });
    } else{
        let decoded = jwt.verify(token);

        checkQuery = "SELECT user_idx FROM user WHERE user_email = ?";
        checkResult = await db.queryParam_Arr(checkQuery, [decoded.user_email]);
        
        let user_idx = checkResult[0].user_idx;

        if (!checkResult){
            res.status(500).send({
                message : "Internal server error"
            });
        }else if(decoded == -1){
            res.status(500).send({
                message : "token err"
            });
        }else{ 
            let deleteQuery = "DELETE FROM fridge WHERE user_idx = ? && fri_item_idx = ?";
            let deleteResult = await db.queryParam_Arr(deleteQuery, [user_idx, fri_item_idx]);
            if (!deleteResult){ 
                res.status(500).send({
                    message : "Fridge Delete Error"
                });
            }else{
                let deleteQuery = "DELETE FROM fridge_item WHERE fri_item_idx = ?";
                let deleteResult = await db.queryParam_Arr(deleteQuery, [fri_item_idx]);
                if (!deleteResult){ 
                    res.status(500).send({
                        message : "Fridge item Delete Error"
                    });
                } else{
                    res.status(200).send({
                        message : "Success to delete Fridge item"
                    });
                }
            }
        }
    }
});

router.put('/', async (req, res)=>{
    let fri_item_idx = req.body.fri_item_idx;
    let fri_img = req.body.fri_img;
    let fri_cate = req.body.fri_cate;
    let fri_name = req.body.fri_name;
    let fri_ex_date = req.body.fri_ex_date;
    let fri_info = req.body.fri_info;
    
    if( !fri_img || !fri_cate || !fri_name || !fri_ex_date || !fri_info || !fri_item_idx){
        res.status(400).send({
            message : "Value Error - Fail from client"
        });
    }else{
        let registerQuery = "UPDATE fridge_item SET fri_img = ?, fri_cate = ?, fri_name = ?, fri_ex_date = ?, fri_info = ? WHERE fri_item_idx = ?";
        let registerResult = await db.queryParam_Arr(registerQuery, [fri_img, fri_cate, fri_name, fri_ex_date, fri_info, fri_item_idx]);
        if (!registerResult){ 
            res.status(500).send({
                message : "Modify Error"
            });
        }else{
            res.status(200).send({
                message : "Success to modify Data"
            });
        }
    }
});

module.exports = router;
