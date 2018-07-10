const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');			// queryParam_None, queryParam_Arr 두 개의 메소드
const identifier = require('../../../module/token_identifier.js');

router.get('/', async (req, res)=>{
    let token = req.headers.token;
    let user_email;

    return new Promise((resolve, reject)=>{
        identifier(token, function(err, result){
            if(err) reject(err);
            else resolve(result);
        });
    }).then(function(identify_data){
        user_email = identify_data; 
    }).catch(function(err){
        res.status(500).send({
            message : err
        });
        return ;
        console.log(err);
    });

    if (!token) {
		res.status(400).send({
			message : "token is empty"
		});
	}else{
        checkQuery = "SELECT user_idx FROM user WHERE user_email = ?";
        checkResult = await db.queryParam_Arr(checkQuery, [user_email]);
        console.log(user_email);
        console.log(checkResult);
        
        let user_idx = checkResult[0].user_idx;

        if(!checkResult){
            res.status(400).send({
                message : "No user_idx value"
            });
        } else {
            let getItemListQuery = "SELECT fridge_item.* FROM fridge JOIN fridge_item ON fridge.fri_item_idx = fridge_item.fri_item_idx WHERE fridge.user_idx = ? ORDER BY fri_regist_date DESC;"
            let itemList = await db.queryParam_Arr(getItemListQuery, [user_idx]);
            if (!itemList) {
                res.status(500).send({
                    message : "Internal Server Error"
                });
            }else{
                res.status(200).send({
                    message : "Success to get Data",
                    data : itemList
                });
            }
        }
    }
});

module.exports = router;
