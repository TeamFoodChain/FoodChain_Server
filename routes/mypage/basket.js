const express = require('express');
const router = express.Router();
const db = require('../../module/pool.js');
const jwt = require('../../module/jwt.js');
const moment = require('moment');

/*장바구니에 상품 추가 */ 
router.post('/', async (req, res, next) => {
    let token = req.headers.token;
    console.log(token);

    if (!token) {
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
            let pro_idx = req.body.pro_idx;

            if(!pro_idx){ 
                res.status(400).send({      //데이터가 없는 경우      
                    message: "Null Value"
                })
            }else{
                let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
                let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.email]); 
                let user_idx = select_idxResult[0].user_idx;
                let insertQuery = "INSERT INTO basket WHERE (user_idx,pro_idx) VALUES (?,?)";
                let insertResult = await db.queryParam_Arr(insertQuery,[user_idx, pro_idx]);
                
                if(!insertQuery){
                    res.status(500).send({
                        message : "Internal Server Error"
                    });
                }else{
                    res.status(200).send({
                        message: "Success to add"
                    });
                }
            }
        }
    }
});

/*사용자 장바구니 상품 목록 보여주기 */
router.get('/',async (req,res,next)=> { 
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
        
          }else{
            let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
            let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.email]); 
            let user_idx = select_idxResult[0].user_idx;
            let selectQuery = "SELECT * FROM  basket WHERE user_idx =? ORDER BY basket_date DESC";  
            let selectResult = await db.queryParam_Arr(selectQuery, [user_idx]);
            if(!selectResult){
                res.status(500).send({
                    message : "Internal Server Error"
                });
            }else if (selectResult.length === 0){
                res.status(400).send({
                    message:"No data"
                })
            }else {
                for(let i=0; i<selectResult.length; i++){
                    selectResult[i].basket_date =moment(selectResult[i].basket_date).format('YYYY-MM-DD HH:mm:ss');  //등록날짜 추가
                }
                res.status(200).send({
                    message:"Success to load",
                    data: selectResult
                })
            }
        }
    }

});

/*장바구니의 상품 삭제*/
router.delete('/',async (req,res,next)=>{
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
            let pro_idx = req.body.pro_idx;
            console.log(pro_idx);
 
            if(!pro_idx){
                res.status(400).send({
                    message: "Null Value"
                })
            }else{
                let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
                let select_idxResult = await db.queryParam_Arr(select_idxQuery,[decoded.email]); 
                let user_idx = select_idxResult[0].user_idx;
                let deleteQuery = "DELETE FROM basket WHERE user_idx =? AND pro_idx =?";
                let deleteResult = await db.queryParam_Arr(deleteQuery, [user_idx, pro_idx]);
                if(!deleteResult){
                     res.status(500).send({
                         message : "Internal server error"
                        })
                     }else{
                         res.status(200).send({
                             message : "Succsss to delete"
                            })
                        }
                    }
                }}
            });
module.exports = router;
