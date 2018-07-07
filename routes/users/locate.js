const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');

router.get('/', (req, res, next) => {
    res.render('index', { title: 'users/locate' });
});

router.post('/', async function(req, res, next) {
    let token = req.headers.token;
    console.log(token);

    if(!token){
        res.status(500).send({
            message : "Token Error"
        });
    }else{
        let decoded = jwt.verify(token);  
        console.log(decoded);
        
        if ( decoded === -1) {
            res.status(500).send({
                message: "Token Error"
        })
    }else {
        let user_addr = req.body.locate_name;
        let user_addr_lat = req.body.locate_lat;
        let user_addr_long = req.body.locate_long;  

        if (!user_addr || !user_addr_lat || !user_addr_long){ 
            res.status(400).send({                             //data 값이 하나라도 없는 경우
                message: "Null Value"
            })
        }else {
            let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
            let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.email]); 
            let user_idx = select_idxResult[0].user_idx;
            let insertQuery = "INSERT INTO user WHERE (user_addr, user_addr_lat, user_addr_long) VALUES (?,?,?)";
            let insertResult = await db.queryParam_Arr(insertQuery,[user_addr, user_addr_lat, user_addr_long]);
            
            if(!insertQuery){
                res.status(500).send({
                    message : "Internal Server Error"
                });
            }else{
                res.status(200).send({
                    message: "Success to register the address",
                    data : insertResult
                })
            }
        }
    }
            
        }
       
});



module.exports = router;
