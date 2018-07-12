const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');
 
router.get('/',async (req,res)=> { 
    let token = req.headers.token;
    let decoded = jwt.verify(token);
 
    let selectQuery;
    let selectResult;
 
    if(decoded == -1) {
        res.status (500).send({
            message : "Internal server error"
        });
        console.log(decoded);
        console.log(token);
    }else{
        if(decoded.identify == 0){
            selectQuery = "SELECT user.user_name, user.user_img, user.user_point, count(coupon_idx) as coupon_count FROM user JOIN user_coupon WHERE user.user_email = ?";
            selectResult = await db.queryParam_Arr(selectQuery,[decoded.id]);
        }else if (decoded.identify == 1){
            selectQuery = "SELECT supplier.sup_name, supplier.sup_img, supplier.sup_point, count(coupon_idx) as coupon_count FROM supplier JOIN user_coupon WHERE supplier.sup_email = ?";  
            selectResult = await db.queryParam_Arr(selectQuery, [decoded.id]);
        }

        if(!selectResult){
            res.status(500).send({
                message : "Internal Server Error"
            });
        }else{
            res.status(200).send({
                message:"Success to load",
                data: selectResult
            });
        }
    }
});

module.exports = router;