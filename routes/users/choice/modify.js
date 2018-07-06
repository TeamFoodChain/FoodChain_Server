const express = require('express');
const router = express.Router();
const db = require('../../../module/pool.js');
const jwt = require('../../../module/jwt.js');

router.get('/', (req, res, next) => {
    res.render('index', { title: 'users/modify' });
});
router.put('/', async function(req, res, next) {
    let token = req.headers.token;
    console.log(token);

    if(!token){
        res.status(500).send({
            message: "Token Error"
        });
    }else{
        let decoded = jwt.verify(token); 
        console.log(decoded);

        if(decoded === -1){
            res.status(500).send({
                message : "Token Error"
            })
        }else{
            let user_interest= req.body.pro_cate;
    
            if(user_interest.length<3){
                res.status(400).send({
                    message : "lack of information"
                });
            }else{
              let select_idxQuery = "SELECT user_idx FROM user WHERE user_email = ?"
              let select_idxResult = await db.queryParamArr(select_idxQuery,[decoded.email]); 
              let user_idx = select_idxResult[0].user_idx;
              let selectQuery = "SELECT user_interest FROM interest WHERE user_idx =?"; 
              let selectResult = await db.queryParamArr(selectQuery,[user_idx]);
              
              if(!selectResult){
                res.status(500).send({
                  message: "Internal server error"
                })
              }else if(selectResult.length ===0){ //잘못 입력
                res.status(400).send({
                  message:"wrong user index"
                })
              }else{
                
                if(selectResult[0].user_idx === decoded.user_idx){
          
                let updateQuery = "UPDATE FROM interest SET user_interest=? WHERE user_idx= ?";
                let updateResult = await db.queryParamArr(updateQuery,[user_interest]);
                
                if(!updateResult){
                  res.status(500).send({
                    message: "Internal server error"
                  })
                }else{
                  res.status.send(200)({
                    message: "Success to modify data"
                  })
                }
              }else{
                res.status(200).send({
                  message:"Unauthorized user"
                })
              }
            }
    
        }

            }
        }
        
   
  });
 
module.exports = router;
