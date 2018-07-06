const jwt = require('jsonwebtoken');

const secretKey = require('../config/secretKey.js').secret;


module.exports = {
  sign : function(email,password,identify) {
    const options = {
      algorithm : "HS256",
      
    };
    const payload = {
      email : email,
      password : password,
      identify : identify
    };
    let token = jwt.sign(payload, secretKey, options);
    return token;
  },
  verify : function(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, secretKey); //데이터 값이 넘어옴 
    }
    catch(err) {
      if(err.message === 'jwt expired') console.log('expired token');
      else if(err.message === 'invalid token') console.log('invalid token'); 
    }
    if(!decoded) {
      return -1;
    }else {
      return decoded;
    }
  }
};