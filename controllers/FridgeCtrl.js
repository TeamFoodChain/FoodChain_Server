const fridgeModel = require('../models/FridgeModel');

module.exports.storeRegister = (req, res, next) => {
	let authData = req.authData;
	let body = req.body;
	let files = req.files;

	fridgeModel.storeRegister(body, files, authData, function(err, result){

		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : result
			});
		}
	});
}

module.exports.storeRegisterDelete = (req, res, next) => {
	let authData = req.authData;
	let pro_idx = req.body.pro_idx;

	fridgeModel.storeRegisterDelete(pro_idx, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : "Success to delete data"
			});
		}
	});
}

module.exports.storeList = (req, res, next) => {
	let authData = req.authData;

	fridgeModel.storeList(authData, function(err, result){
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

module.exports.manageRegister = (req, res, next) => {
	let authData = req.authData;
	let body = req.body;
	let files = req.files;
	let token = req.headers.token;

	fridgeModel.manageRegister(body, files, token, authData, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : "Success to upload data"
			});
		}
	});
}

module.exports.manageRegisterDelete = (req, res, next) => {
	let authData = req.authData;
	let fri_item_idx = req.body.fri_item_idx;
	let token = req.headers.token;

	fridgeModel.manageRegisterDelete(fri_item_idx, token, authData, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : "Success to delete data"
			});
		}
	});
}

module.exports.manageList = (req, res, next) => {
	let token = req.headers.token;

	fridgeModel.manageList(token, function(err, result){
		if(err){
			res.status(err[0]).send({
				message : err[1]
			});
		} else {
			res.status(200).send({
				message : "Success to get Data",
				data : result
			});
		}
	});
}