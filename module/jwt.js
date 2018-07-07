const jwt = require('jsonwebtoken');
<<<<<<< HEAD
const secretKey = require('../config/secretKey.js').secret;

module.exports = {
  sign : function(user_email, user_pw, identify) {
    const options = {
      algorithm : "HS256",
      expiresIn : 60 * 60 * 24 * 30 //30 days
    };
    const payload = {
      user_email : user_email,
      user_pw : user_pw,
      identify : identify
    };
    let token = jwt.sign(payload, secretKey, options);
    return token;
  }, // 토큰 생성

=======

const secretKey = require('../config/secretKey.js').secret;


module.exports = {
  sign : function(email, phone, identify) {
    const options = {
      algorithm : "HS256"
    };
    const payload = {
      email : email,
      phone : phone,
      identify : identify 
    };
    let token = jwt.sign(payload, secretKey, options);
    return token;
  },
>>>>>>> dev
  verify : function(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
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