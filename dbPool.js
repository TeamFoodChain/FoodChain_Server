const mysql = require('mysql');
const dbConfig = {
  	host : 'foodchain.cid5q6peutnp.ap-northeast-2.rds.amazonaws.com',
	port : 3306,
	user : 'KSJ',
	password : 'foodfood',
	database : 'foodchain',
	connectionLimit : 20
}

module.exports = mysql.createPool(dbConfig); // 사용자 모듈 생성