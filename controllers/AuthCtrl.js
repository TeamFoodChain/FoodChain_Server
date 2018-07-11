const authModel = require('../models/AuthModel');


module.exports.auth = (req, res, next) => {
	if (!req.headers.token) {
		return next(400);
	} else {
		authModel.auth(req.headers.token, (err, authData) => {
			if (err) {
				res.status(err[0]).send({
					message : err[1]
				});
			} else {
				req.authData = authData;
				return next();
			}
		});
	}
}