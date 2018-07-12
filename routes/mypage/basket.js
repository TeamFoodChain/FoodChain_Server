const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');
const moment = require('moment');


/*장바구니에 상품 추가 */ 
router.post('/', async (req, res, next) => {
    let token = req.headers.token;
    let decoded = jwt.verify(token);
    let pro_idx = req.body.pro_idx;

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
            select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let user_idx = select_idxResult[0].user_idx;
            insertQuery = "INSERT INTO basket (user_idx,pro_idx) VALUES (?,?)";
            insertResult = await db.queryParam_Arr(insertQuery,[user_idx, pro_idx]);
        }else{
            select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            insertQuery = "INSERT INTO basket (sup_idx,pro_idx) VALUES (?,?)";
            insertResult = await db.queryParam_Arr(insertQuery,[sup_idx, pro_idx]);
            }
        if(!insertResult){
                res.status(500).send({
                    message : "Internal Server Error"
            });
        }else{
            res.status(200).send({
                message: "Success to Add"
                });
            }}
});

/*사용자 장바구니 상품 목록 보여주기 */
router.get('/',async (req,res,next)=> { 
    let token = req.headers.token;
    let decoded = jwt.verify(token);

    let select_idxQuery;
    let select_idxResult;
    let getProductQuery;
    let result = [];
    let pro_idx = [];
    let select_proQuery;

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal server error"
        });
    }else{
        if(decoded.identify == 0){
            let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]);
            let user_idx = select_idxResult[0].user_idx;
            let select_proQuery = "SELECT pro_idx FROM basket WHERE user_idx = ? ORDER BY basket_date DESC";
            let select_proResult = await db.queryParam_Arr(select_proQuery,[user_idx]); 
            for (let i = 0; i < select_proResult.length; i++) {
                pro_idx[i] = select_proResult[i].pro_idx;
            }
            getProductQuery = "SELECT product.pro_idx, product.pro_name, product.pro_price , product.pro_sale_price, product.pro_ex_date, product.pro_regist_date, product.pro_info, product_image.pro_img FROM product INNER JOIN product_image ON product.pro_idx = product_image.pro_idx WHERE product.pro_idx =  ?";
            for(let i = 0 ; i < pro_idx.length; i++){
                result[i] = await db.queryParam_Arr(getProductQuery, [pro_idx[i]]);

            }
        }else {
            let select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
            let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            let select_proQuery = "SELECT pro_idx FROM basket WHERE sup_idx = ? ORDER BY basket_date DESC";
            let select_proResult = await db.queryParam_Arr(select_proQuery,[sup_idx]); 
            for (let i = 0; i < select_proResult.length; i++) {
                pro_idx[i] = select_proResult[i].pro_idx;
            }
            getProductQuery = "SELECT product.pro_idx, product.pro_name,  product.pro_price , product.pro_sale_price, product.pro_ex_date, product.pro_regist_date, product.pro_info, product_image.pro_img FROM product INNER JOIN product_image ON product.pro_idx = product_image.pro_idx WHERE product.pro_idx =  ?";
            for(let i = 0 ; i < pro_idx.length; i++){
                result[i] = await db.queryParam_Arr(getProductQuery, [pro_idx[i]]);
            }
            }
            if(!result){
                res.status(500).send({
                    message : "Internal Server Error"
                }); 

            }else if (result.length === 0){
                res.status(400).send({
                    message:"No Data"
                });
            }else{
                res.status(200).send({
                    message:"Success to Get Data",
                    data: result
                });
            }
        }
    
});

/*장바구니의 상품 삭제*/
router.delete('/',async (req,res,next)=>{
    let token = req.headers.token;
    let decoded = jwt.verify(token);
    let pro_idx = req.body.pro_idx;

    let select_idxQuery;
    let select_idxResult;
    let deleteQuery;
    let deleteResult;

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal server error"
        });

    }else{
        if(decoded.identify ==0){
            select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let user_idx = select_idxResult[0].user_idx;
            deleteQuery = "DELETE FROM basket WHERE user_idx =? AND pro_idx =?";
            deleteResult = await db.queryParam_Arr(deleteQuery, [user_idx, pro_idx]);
        }else{
            select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            deleteQuery = "DELETE FROM basket WHERE sup_idx =? AND pro_idx =?";
            deleteResult = await db.queryParam_Arr(deleteQuery, [sup_idx, pro_idx]);

            }
            if(!deleteResult){
                res.status(500).send({
                    message : "Internal server error"
                })
            }else{
                res.status(200).send({
                    message : "Succsss to delete"
                })
            }}
        });
module.exports = router;
