const authModel = require('../models/AuthModel');
const imageModel = require('../models/ImageModel');

//market/near
module.exports.nearby = async (req, res, next) => { 
	let authData = req.authData;

	let nearData = imageModel.nearby(authData, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else{
			res.status(200).send({
				message : "Success to GET",
				data : nearData
			});
		}
	});

}