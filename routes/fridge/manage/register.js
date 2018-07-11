const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');			// queryParam_None, queryParam_Arr 두 개의 메소드
const moment = require('moment');
const jwt = require('../../../module/jwt.js');
const s3 = require('../../../config/s3multer.js');
const multer = require('multer');
const upload = multer();

router.post('/', upload.array('fri_img'), async (req, res)=>{
    let token = req.headers.token;

	let fri_item_idx = req.body.fri_item_idx;
    let fri_cate = req.body.fri_cate;
    let fri_name = req.body.fri_name;
    let fri_ex_date = req.body.fri_ex_date;
    let fri_info = req.body.fri_info;
    let fri_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");

    let fri_img = [];

    let registerQuery;
    let registerResult;

    if(!fri_cate || !fri_name || !fri_ex_date || !fri_info || !token || !fri_regist_date){
        res.status(400).send({
            message : "Value Error : Fail from client"
        });
        console.log(fri_cate, fri_name, fri_ex_date, fri_info, token, fri_regist_date);
    }else{    
        let decoded = jwt.verify(token);

        if(!fri_item_idx) {
            if(decoded == -1){
                res.status(400).send({
                    message : "Value Error : Fail from client"
                });
            }else{
                let selectQuery = "SELECT user_idx FROM user WHERE user_email= ?";
                let selectResult = await db.queryParam_Arr(selectQuery, [decoded.id]);
                let user_idx = selectResult[0].user_idx;
                
                if(!selectResult){
                    res.status(400).send({
                        message : "Value Error : Fail from client"
                    });
                }else{
                    if(req.files){ // 이미지 db, s3에 저장
                        console.log(req.files);
                        // multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
                        for(let i = 0 ; i < req.files.length ; i++){
                            fri_img[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + req.files[i].originalname.split('.').pop();
                            s3.upload(req.files[i]);
                        }
                    }

                    registerQuery = "INSERT INTO fridge_item (fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date) VALUES(?, ?, ?, ?, ?)";
                    registerResult = await db.queryParam_Arr(registerQuery, [fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date]);
                    let fri_item_idx = registerResult.insertId;
                    
                    if (!registerResult){ 
                        res.status(500).send({
                            message : "Register Error"
                        });
                    }else{
                        registerQuery = "INSERT INTO fridge (user_idx, fri_item_idx) VALUES (?, ?)";
                        registerResult = await db.queryParam_Arr(registerQuery, [user_idx, fri_item_idx]);
                        
                        if (!registerResult){
                            res.status(400).send({
                                message : "fri_item insert Error"
                            });
                        }else{
                            registerQuery = "INSERT INTO fridge_item_image (fri_item_idx, fri_img) VALUES (?, ?)";
                            for(let i = 0 ; i < fri_img.length ; i++){
                                registerResult = await db.queryParam_Arr(registerQuery, [fri_item_idx, fri_img[i]]);
                                if(!registerResult) {
                                    res.status(500).send({
                                        message : "Internal Server Error"
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
        }else{                         
            let UpdateFriItemQuery = "UPDATE fridge_item SET fri_cate = ?, fri_name = ?, fri_ex_date = ?, fri_info = ? WHERE fri_item_idx = ?";
            let UpdateFriItemResult = await db.queryParam_Arr(UpdateFriItemQuery, [fri_cate, fri_name, fri_ex_date, fri_info, fri_item_idx]);
            if(!UpdateFriItemResult){
                res.status(500).send({
                    message : "Internal server error"
                });
            }else{
                let getFriItemImageQuery = "SELECT fri_img FROM fridge_item_image WHERE fri_item_idx = ?";	
                let getFriItemImageResult = await db.queryParam_Arr(getFriItemImageQuery, [fri_item_idx]);
                if(!getFriItemImageResult){
                    res.status(500).send({
                        message : "Internal server error"
                    });
                }else{
                    if(getFriItemImageResult.length != 0){
						for(let i = 0 ; i < getFriItemImageResult.length ; i++){
							fri_img[i] = {};
							fri_img[i].Key = getFriItemImageResult[i].fri_img.substring(55, getFriItemImageResult[i].fri_img.length);
						}
						console.log(fri_img);
                    }
                    let DeleteFriItemImageQuery = "DELETE FROM fridge_item_image WHERE fri_item_idx = ?";
                    let DeleteFriItemImageResult = await db.queryParam_Arr(DeleteFriItemImageQuery, [fri_item_idx]);
                    if(!DeleteFriItemImageResult){
                        res.status(500).send({
                            message : "Internal server error"
                        });
                    }else{
                        if(fri_img.length == 0){
                        } else{
                            console.log("fri_img : ");
                            console.log(fri_img);
                            s3.delete(fri_img);

                            if(req.files){ // s3에 저장
                                fri_img = [];
                                console.log(req.files);
                                // multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
                                for(let i = 0 ; i < req.files.length ; i++){
                                    fri_img[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + req.files[i].originalname.split('.').pop();
                                    s3.upload(req.files[i]);
                                }
                            }

                            let insertProductImageQuery = "INSERT INTO fridge_item_image (fri_item_idx, fri_img) VALUES(?, ?)";
                            for(let i = 0 ; i < fri_img.length ; i++){
                            let insertProductImageResult = await db.queryParam_Arr(insertProductImageQuery, [fri_item_idx, fri_img[i]]);
                                if(!insertProductImageResult) {
                                    res.status(500).send({
                                        message : "Internal Server Error"
                                    });
                                }else{
                                    res.status(200).send({
                                        message : "Success to modify Data"
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});

router.delete('/', async (req, res)=>{
    let token = req.headers.token;
    let fri_item_idx = req.body.fri_item_idx;

    let checkQuery;
    let checkResult;
    let fri_img = [];
    
    if( !fri_item_idx || !token) {
        res.status(400).send({
            message : "Value Error - Fail from client"
        });
    }else{    
        let decoded = jwt.verify(token);
        
        if(decoded == -1){
            res.status(400).send({
                message : "Value Error - Fail from client"
            });
        }else{
            checkQuery = "SELECT fri_img FROM fridge_item_image WHERE fri_item_idx = ?";
            checkResult = await db.queryParam_Arr(checkQuery, [fri_item_idx]);

            if(checkResult.length != 0){
                for(let i = 0 ; i < checkResult.length ; i++){
                    fri_img[i] = {};
                    fri_img[i].Key = checkResult[i].fri_img.substring(55, checkResult[i].fri_img.length);
                }
                console.log(fri_img);
            }

            if (!checkResult){
                res.status(400).send({
                    message : "Null Value"
                });
            }else{ 
                let deleteQuery = "DELETE FROM fridge WHERE user_idx = ? && fri_item_idx = ?";
                let deleteResult = await db.queryParam_Arr(deleteQuery, [identify_data.idx, fri_item_idx]);
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
                    }else{
                        let deleteQuery = "DELETE FROM fridge_item_image WHERE fri_item_idx = ?";
                        for(let i = 0 ; i < fri_img.length ; i++){
                            let deleteResult = await db.queryParam_Arr(deleteQuery, [fri_item_idx]);
                            if(!deleteResult) {
                                res.status(500).send({
                                    message : "Internal Server Error"
                                });
                            }else{
                                if(fri_img.length == 0){
                                }else{
                                    s3.delete(fri_img);
                                }
                                res.status(200).send({
                                    message : "Success to upload Data"
                                });
                            }
                        }
                    }
                }
            }
        }
    }
});

module.exports = router;
