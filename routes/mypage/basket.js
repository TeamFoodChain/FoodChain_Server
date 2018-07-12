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
    let result;

    

    if(decoded == -1) {
        res.status (500).send({
            message : "Internal server error"
        });
    }else{
        if(decoded.identify ==0){
            select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let user_idx = select_idxResult[0].user_idx;
            getProductQuery = "SELECT pro_idx, pro_name, pro_ex_date, pro_regist_date, pro_info FROM product WHERE pro_idx IN (SELECT pro_idx FROM basket WHERE user_idx = ? ORDER BY basket_date DESC)";
            result = await db.queryParam_Arr(getProductQuery, [user_idx]);
        }else {
            select_idxQuery = "SELECT sup_idx FROM supplier WHERE sup_email = ?";
            select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.id]); 
            let sup_idx = select_idxResult[0].sup_idx;
            getProductQuery = "SELECT pro_idx, pro_name, pro_ex_date, pro_regist_date, pro_info FROM product WHERE pro_idx IN (SELECT pro_idx FROM basket WHERE sup_idx = ? ORDER BY basket_date DESC)";
            result = await db.queryParam_Arr(getProductQuery, [sup_idx]);
            }
            if(!result){
                res.status(500).send({
                    message : "Internal Server Error"
                });
            }else if (result.length === 0){
                res.status(400).send({
                    message:"No Data"
                });
            }else {
                for(let i=0; i<result.length; i++){
                    result[i].basket_date =moment(result[i].basket_date).format('YYYY-MM-DD HH:mm:ss');  //등록날짜 추가
                }
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
