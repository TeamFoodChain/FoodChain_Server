const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.get('/', (req, res, next) => {
    res.render('index', { title: 'users/set' });
});

router.post('/', async function(req, res, next) {
    let token = req.headers.token;
    console.log(token);

    if(!token){
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
            
            if(user_interest.length <3){
                res.status(400).send({
                    message: "lack of information"
                })
            }else{
                let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
                let select_idxResult = await db.queryParamArr(select_idxQuery,[decoded.email]); 
                let user_idx = select_idxResult[0].user_idx;
                let insertQuery = "INSERT INTO interest (user_interest,user_idx) VALUES (?,?)";
                let insertResult = await db.queryParamArr(insertQuery, [user_interest,user_idx]);
    
                if(!insertQuery){
                    res.status (500).send({
                        message : "Internal server error"
                    })
                }else {
                    res.status(200).send({
                        message : "Success"
                    })
                }
            }
        }

            }
  
});


module.exports = router;
