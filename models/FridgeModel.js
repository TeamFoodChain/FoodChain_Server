const async = require('async');
const pool = require('../config/dbPool.js');
const pool_async = require('../config/dbPool_async.js');
const moment = require('moment');
const s3 = require('../config/s3multer.js');
const db = require('../module/pool.js');
const multer = require('multer');
const upload = multer();
const jwt = require('../module/jwt.js');


const authModel = require('../models/AuthModel');


module.exports.storeRegister = async (body, files, authData, callback) =>{
	let mar_idx;

	let pro_idx = body.pro_idx;
	let pro_name = body.pro_name;
	let pro_cate = body.pro_cate;
	let pro_ex_date = body.pro_ex_date;
	let pro_info = body.pro_info;
	let pro_price = body.pro_price;
	let pro_sale_price = body.pro_sale_price;
	let pro_origin = body.pro_origin;
	let pro_istimesale = body.pro_istimesale;
	let pro_deadline = body.pro_deadline;
	let pro_image = [];

	let pro_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");

	if(authData.identify == 0){
		console.log("Access denied");
		callback([400, "Access denied"]); // callback이 발생해도 밑에 코드가 실행된다...
		return;
	}
	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	if(!pro_name || !pro_cate || !pro_ex_date || !pro_price || !pro_sale_price || !pro_origin || !pro_istimesale || !pro_deadline){
		console.log("Null Value");
		callback([400, "Null Value"]);
		return ;
	}

	if(!pro_idx){

	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
			pool.getConnection(function(err, connection) {
				if (err) {
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection);
				}
			});
		},
		// 2. mar_idx 값 가져오기
		function(connection, callback){
			let getMar_idxQuery = "SELECT mar_idx FROM supplier WHERE sup_idx = ?";
			connection.query(getMar_idxQuery, authData.idx, function(err, result){
				if(err) {
					console.log("connection.query Error : " + err)
					callback([500, "Internal Server Error"]);
					connection.release();
				} else {
					mar_idx = result[0].mar_idx;
					callback(null, connection); 
				}
			});
		},
		// 3. s3에 이미지 등록
		function(connection, callback){
			console.log(files);
			if(files.length!=0){ // 이미지 db, s3에 저장
			// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
				for(let i = 0 ; i < files.length ; i++){
					pro_image[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + files[i].originalname.split('.').pop();
					//s3.upload(req.files[i]);
				}
				(async function(){
					let result = await s3.upload(files);
					console.log(result);
					callback(null, connection);
				})();
			} else{
				callback(null, connection);
			}
		},
		// 4. token 값이 옳으면, 상품을 등록한다. 등록 후, 등록 한 상품의 index값을 가져온다.
		function(connection, callback){
			let insertProductQuery = "INSERT INTO product (pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin, pro_istimesale, pro_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			connection.query(insertProductQuery, [pro_cate, pro_name, pro_price, pro_sale_price, pro_ex_date, pro_regist_date, pro_info, mar_idx, pro_origin, pro_istimesale, pro_deadline], function(err, result){
				if(err) {
					connection.release();
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection);
				}
			});
		},
		// 5. 방금 추가한 상품의 index값 얻어오기
		function(connection, callback){
			let getProductIdxQuery = "SELECT LAST_INSERT_ID() as pro_idx";
			connection.query(getProductIdxQuery, function(err, result){
				if(err) {
					connection.release();
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection, result[0]);
				}
			});
		},


		// 6. image는 테이블이 따로 있으므로 3에서 구한 pro_idx값을 이용해서 따로 저장해 준다.
		function(connection, result, callback){
			let insertProductImageQuery = "INSERT INTO product_image (pro_idx, pro_img) VALUES(?, ?)";
			for(let i = 0 ; i < pro_image.length ; i++){
				connection.query(insertProductImageQuery, [result.pro_idx, pro_image[i]], function(err, result){
					if(err) {
						connection.release();
						console.log("pool.getConnection Error : " + err);
						callback([500, "Internal Server Error"]);
					} 
				});

			}
			callback(null, connection, result);
		},
		// 7. sell_list에 추가해 준다.
		function(connection, result, callback){
			let insertSell_ListImageQuery = "INSERT INTO sell_list (sup_idx, pro_idx) VALUES(?, ?)";
			connection.query(insertSell_ListImageQuery, [authData.idx, result.pro_idx], function(err, result){
				if(err) {
					connection.release();
					console.log("pool.getConnection Error : " + err);
					callback([500, "Internal Server Error"]);
				}  else{
					callback(null, "Success to upload product");
					connection.release();
				}
			});
		}
		];
		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
				callback(err);
			} else {
				console.log(result);
				callback(null, "Success to upload product");
			}
		});


	} else { //pro_idx가 있을 때 (상품을 수정)
		let taskArray = [
			// 1. pool에서 connection 하나 가져오기
			function(callback) {
				pool.getConnection(function(err, connection) {
					if (err) {
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					} else {
						callback(null, connection);
					}
				});
			},

			// 2. 수정사항 등록
			function(connection, callback){
				let UpdateProductQuery = "UPDATE product SET pro_name = ?, pro_cate = ?, pro_ex_date = ?, pro_regist_date = ?, pro_info = ? , pro_price = ?, pro_sale_price = ?, pro_origin = ?, pro_istimesale = ?, pro_deadline = ? WHERE pro_idx = ?";

				connection.query(UpdateProductQuery, [pro_name, pro_cate, pro_ex_date,pro_regist_date , pro_info, pro_price, pro_sale_price, pro_origin, pro_istimesale, pro_deadline, pro_idx], function(err, result){
					if(err) {
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					} else {
						callback(null, connection);
					}
				});
			},
			// 3. product image 가져오기
			function(connection, callback){
				let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";		

				connection.query(getProductImageQuery, pro_idx, function(err, result){
					if(err) {
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					}		

					if(result.length != 0){
						for(let i = 0 ; i < result.length ; i++){
							pro_image[i] = {};
							pro_image[i].Key = result[i].pro_img.substring(55, result[i].pro_img.length);
						}
						console.log(pro_image);
					}
					callback(null, connection);
				});
			},
			// 4. DB에서 image 삭제
			function(connection, callback){
				let DeletePorductImageQuery = "DELETE FROM product_image WHERE pro_idx = ?";

				connection.query(DeletePorductImageQuery, pro_idx, function(err, result){
					if(err) {
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					} else {
						callback(null, connection);
					}
				});
			},

			// 5. s3에서 이미지 삭제
			function(connection, callback){
				if(pro_image.length == 0){
				} else{
					s3.delete(pro_image);
				}
					callback(null, connection);
				},

			// 6. s3에 이미지 등록
			function(connection, callback){
				console.log(files);
				if(files.length!=0){ // 이미지 db, s3에 저장
				// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
					for(let i = 0 ; i < files.length ; i++){
						pro_image[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + files[i].originalname.split('.').pop();
						//s3.upload(req.files[i]);
					}
					(async function(){
						let result = await s3.upload(files);
						console.log(result);
						callback(null, connection);
					})();
				} else{
					callback(null, connection);
				}
			},
			// 7. DB에 새로운 이미지를 등록
			function(connection, callback){
			let insertProductImageQuery = "INSERT INTO product_image (pro_idx, pro_img) VALUES(?, ?)";
			for(let i = 0 ; i < pro_image.length ; i++){
				connection.query(insertProductImageQuery, [pro_idx, pro_image[i]], function(err, result){
					if(err) {
						connection.release();
						console.log("connection.query Error : " + err);
						callback([500, "Internal Server Error"]);
					} 
				});

			}
			callback(null, "Success to modify data");
			connection.release();
			}
			];
		async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				console.log(result);
				callback(null, result);
			}
		});			
	}

}

module.exports.storeRegisterDelete = async (pro_idx, callback) =>{
	let pro_images = []; // 삭제 할 product image를 담는 배열

	// 상품의 카테고리, 이름, 유통기한의 값이 없는 경우
	console.log(pro_idx);
	if(!pro_idx){
		console.log("No pro_idx value");
		callback([400, "No pro_idx value"]);
		return ;
	}

	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
				pool.getConnection(function(err, connection) {
				if (err) {
					console.log("connection.query Error : " + err);
					callback([500, "Internal Server Error"]);
				} else {
					callback(null, connection);
				}
			});
		},
		// 2. product image 가져오기
		function(connection, callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";

			connection.query(getProductImageQuery, pro_idx, function(err, result){
				if(err) {
					connection.release();
					console.log("connection.query Error : " + err);
					callback([500, "Internal Server Error"]);
				}

				if(result.length != 0){
					for(let i = 0 ; i < result.length ; i++){
						pro_images[i] = {};
						pro_images[i].Key = result[i].pro_img.substring(55, result[i].pro_img.length);
					}
					console.log(pro_images);
				}
				callback(null, connection);
			});
		},
		// 3. product table에서 row삭제, 참조된 테이블의 row도 같이 삭제
		function(connection, callback){
			let deleteProductQuery = "DELETE FROM product WHERE pro_idx = ?";

			connection.query(deleteProductQuery, pro_idx, function(err, result){
				if(err) {
					connection.release();
					console.log("connection.query Error : " + err);
					callback([500, "Internal Server Error"]);
				}
				if(result.length == 0){
					connection.release();
					console.log("Null Value");
					callback([400, "Null Value"]);
				} else {
					callback(null);
					connection.release();
				}
			});
		},
		// 4. s3 상에서도 image 삭제
		function(callback){
			if(pro_images.length == 0){
			} else{
				s3.delete(pro_images);
			}
				callback(null, "Success to delete product");
		}
		];

	async.waterfall(taskArray, function(err, result){
			if(err){
				console.log(err);
			} else {
				console.log(result);
				callback(null, result);
			}
		});
}

module.exports.storeList = async (authData, callback) => {
	let product = []; // 전달 할 상품 정보 배열


	if(authData.identify == 0){
		console.log("Access denied");
		callback([400, "Access denied"]); // callback이 발생해도 밑에 코드가 실행된다...
		return;
	}

	let taskArray = [
		// 1. 공급자가 올린 상품을 가져온다. (판매 중, 판매완료, 타임세일 상관없이 다 가져옴)
		function(callback){
			let getSaleProductQuery = "SELECT pro_idx, pro_name, pro_ex_date, pro_regist_date, pro_info FROM product WHERE mar_idx IN (SELECT mar_idx FROM supplier WHERE sup_idx = ?)";

			(async function(){
				let connections = await pool_async.getConnection();
				let result = await connections.query(getSaleProductQuery, authData.idx);

				for(let i = 0 ; i < result[0].length ; i++){
					let item = result[0];
					product[i] = {};
					product[i].pro_idx = item[i].pro_idx;
					product[i].pro_name = item[i].pro_name;
					product[i].pro_ex_date = item[i].pro_ex_date;
					product[i].pro_regist_date = item[i].pro_regist_date;
					product[i].pro_info = item[i].pro_info;
					product[i].pro_img = null;
				}
				connections.release();
				callback(null);
			})();
		},
		// 2. 상품 이미지 가져오기
		function(callback){
			let getProductImageQuery = "SELECT pro_img FROM product_image WHERE pro_idx = ?";
			(async function(){
				let connections = await pool_async.getConnection();
				for(let i = 0 ; i < product.length ; i++){
					let result = await connections.query(getProductImageQuery, product[i].pro_idx);
					if(result[0].length != 0){
						let img = result[0]
						product[i].pro_img = img[0].pro_img;
					}
				}
				connections.release();
				callback(null, "Success to get data");
			})();
		}
		];
	async.waterfall(taskArray, function(err, result){
		if(err){
			console.log(err);
			callback(err);
		} else {
			console.log(result);
			callback(null, product);
		}
	});			
}

module.exports.manageRegister = async (body, files, token, callback) => {
	let fri_item_idx = body.fri_item_idx;
    let fri_cate = body.fri_cate;
    let fri_name = body.fri_name;
    let fri_ex_date = body.fri_ex_date;
    let fri_info = body.fri_info;
    let fri_regist_date = moment().format("YYYY-MM-DD HH:mm:ss");
    let pro_image = [];

    let fri_img = [];

    let registerQuery;
    let registerResult;

    if(!fri_cate || !fri_name || !fri_ex_date || !fri_info || !token || !fri_regist_date){
        console.log("Value Error : Fail from client");
        callback([400, "Value Error : Fail from client"]);
        return ;
    }else{    
        let decoded = jwt.verify(token);
        if(!fri_item_idx) {
            if(decoded == -1){
	            console.log("Value Error : Fail from client");
	   			callback([400, "Value Error : Fail from client"]);
        		return ;
            }else{
                let selectQuery = "SELECT user_idx FROM user WHERE user_email= ?";
                let selectResult = await db.queryParam_Arr(selectQuery, [decoded.id]);
                let user_idx = selectResult[0].user_idx;
                
                if(!selectResult){
                    console.log("Value Error : Fail from client");
        			callback([400, "Value Error : Fail from client"]);
        			return ;
        		}else{
                    if(files){ // 이미지 db, s3에 저장
						// multer-s3를 이용하지 않고, multer로 이미지를 가져오고, s3를 이용해서 s3에 이미지 등록
						for(let i = 0 ; i < files.length ; i++){
							pro_image[i] = 'https://foodchainimage.s3.ap-northeast-2.amazonaws.com/' + Date.now() + '.' + files[i].originalname.split('.').pop();
							//s3.upload(req.files[i]);
							}
					(async function(){
						let result = await s3.upload(files);
						console.log(result);
					})();
					}
                    registerQuery = "INSERT INTO fridge_item (fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date) VALUES(?, ?, ?, ?, ?)";
                    registerResult = await db.queryParam_Arr(registerQuery, [fri_cate, fri_name, fri_ex_date, fri_info, fri_regist_date]);
                    let fri_item_idx = registerResult.insertId;
                    
                    if (!registerResult){
                    	console.log("Register Error");
        				callback([500, "Register Error"]);
        				return ; 
                    }else{
                        registerQuery = "INSERT INTO fridge (user_idx, fri_item_idx) VALUES (?, ?)";
                        registerResult = await db.queryParam_Arr(registerQuery, [user_idx, fri_item_idx]);
                        
                        if (!registerResult){
                        	console.log("fri_item insert Error");
     	   					callback([400, "fri_item insert Error"]);
        					return ; 
                        }else {
                            registerQuery = "INSERT INTO fridge_item_image (fri_item_idx, fri_img) VALUES (?, ?)";
                            for(let i = 0 ; i < fri_img.length ; i++){
                                registerResult = await db.queryParam_Arr(registerQuery, [fri_item_idx, fri_img[i]]);
                                if(!registerResult) {
                                	console.log("Internal Server Error");
     	   							callback([500, "Internal Server Error"]);
        							return ; 
                                }
                            }
                            console.log("Success to upload Data");
     	   					callback(null, "Success to upload Data");
        					return ; 
                        }
                    }
                }
            }
        }else{                         
            let UpdateFriItemQuery = "UPDATE fridge_item SET fri_cate = ?, fri_name = ?, fri_ex_date = ?, fri_info = ? WHERE fri_item_idx = ?";
            let UpdateFriItemResult = await db.queryParam_Arr(UpdateFriItemQuery, [fri_cate, fri_name, fri_ex_date, fri_info, fri_item_idx]);
            if(!UpdateFriItemResult){
            	console.log("Internal server error");
     	   		callback([500, "Internal server error"]);
        		return ; 
            }else{
                let getFriItemImageQuery = "SELECT fri_img FROM fridge_item_image WHERE fri_item_idx = ?";	
                let getFriItemImageResult = await db.queryParam_Arr(getFriItemImageQuery, [fri_item_idx]);
                if(!getFriItemImageResult){
                    console.log("Internal server error");
     	   			callback([500, "Internal server error"]);
        			return ; 
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
                        console.log("Internal server error");
     	   				callback([500, "Internal server error"]);
        				return ; 
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
                                    console.log("Internal server error");
     	   							callback([500, "Internal server error"]);
        							return ; 
                                }else{
                                	console.log("Success to modify Data");
     	   							callback(null, "Success to modify Data");
        							return ;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

module.exports.manageRegisterDelete = async (fri_item_idx, token, authData, callback) => {

    let checkQuery;
    let checkResult;
    let fri_img = [];
    
    if( !fri_item_idx || !token) {
    	console.log("Value Error - Fail from client");
        callback([400, "Value Error : Fail from client"]);
        return ;
    }else{    
        let decoded = jwt.verify(token);
        
        if(decoded == -1){
            console.log("Value Error - Fail from client");
        	callback([400, "Value Error : Fail from client"]);
       		return ;
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
            	console.log("Null Value");
        		callback([400, "Null Value"]);
       			return ;
            }else{ 
                let deleteQuery = "DELETE FROM fridge WHERE user_idx = ? && fri_item_idx = ?";
                let deleteResult = await db.queryParam_Arr(deleteQuery, [authData.idx, fri_item_idx]);
                if (!deleteResult){ 
                	console.log("Fridge Delete Error");
        			callback([500, "Fridge Delete Error"]);
       				return ;
                }else{
                    let deleteQuery = "DELETE FROM fridge_item WHERE fri_item_idx = ?";
                    let deleteResult = await db.queryParam_Arr(deleteQuery, [fri_item_idx]);
                    if (!deleteResult){ 
                    	console.log("Fridge item Delete Error");
        				callback([500, "Fridge item Delete Error"]);
       					return ;
                    }else{
                        let deleteQuery = "DELETE FROM fridge_item_image WHERE fri_item_idx = ?";
                        let deleteResult = await db.queryParam_Arr(deleteQuery, [fri_item_idx]);
                        if(!deleteResult) {
                         	console.log("Internal Server Error");
        					callback([500, "Internal Server Error"]);
       						return ;
                        }else{
                            if(fri_img.length == 0){
                            }else{
                               s3.delete(fri_img);
                            }
                            console.log("Success to upload Data");
        					callback(null, "Success to upload Data");
       						return ;
                        }
                    }
                }
            }
        }
    }
}

module.exports.manageList = async (token, callback) => {

    if (!token) {
    	console.log("token is empty");
    	callback([400, "token is empty"]);
    	return ;
	}else{
        let decoded = jwt.verify(token);

        if(decoded == -1){
        	console.log("Decoded Error");
    		callback([500, "Decoded Error"]);
    		return ;
        }else{
            checkQuery = "SELECT user_idx FROM user WHERE user_email = ?";
            checkResult = await db.queryParam_Arr(checkQuery, [decoded.id]);
            console.log(checkResult);
            
            let user_idx = checkResult[0].user_idx;

            if(!checkResult){
            	console.log("No user_idx value");
    			callback([400, "No user_idx value"]);
    			return ;
            } else {
                let getItemListQuery = "SELECT fridge_item.* FROM fridge JOIN fridge_item ON fridge.fri_item_idx = fridge_item.fri_item_idx WHERE fridge.user_idx = ? ORDER BY fri_regist_date DESC;"
                let itemList = await db.queryParam_Arr(getItemListQuery, [user_idx]);
                if (!itemList) {
                	console.log("Internal Server Error");
    				callback([400, "Internal Server Error"]);
    				return ;
                }else{
                	console.log("Success to get Data");
    				callback(null, itemList);
    				return ;
                }
            }
        }
    }
}