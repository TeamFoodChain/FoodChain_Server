const homeModel = require('../models/HomeModel');

//home/category
module.exports.category = async (req, res, next) => {
	let authData = req.authData;
	let pro_cate = req.query.pro_cate;

	homeModel.category(pro_cate, authData, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : "Success to get data",
				data : result
			});
		}
	});

}


module.exports.main = async (req, res, next) => {
	let authData = req.authData;

	homeModel.main(authData, function(err, data, reco){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
		res.status(200).send({
			message : "Success to get data",
			data : data,
			reco : reco
		});
	}
	});
}

module.exports.product = async (req, res, next) => {
	let pro_idx = req.query.pro_idx;
	let mar_idx = req.query.mar_idx;

	homeModel.product(pro_idx, mar_idx, function(err, product_info, supplier_info){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
		res.status(200).send({
			message : "Success to get data",
			product_info : product_info,
			supplier_info : supplier_info
		});
	}
	});
}