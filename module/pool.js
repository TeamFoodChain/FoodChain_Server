const pool = require('../config/dbPool.js');

// 두 개의 메소드 module화
module.exports = {

    //파라미터가 없는 SQL 문
    queryParamNone : async (...args) => {

        const query = args[0];
        let result;

        try {
            var connection = await pool.getConnection();// connection을 pool에서 하나 가져온다.
            result = await connection.query(query) || null;// query문의 결과 || null 값이 result에 들어간다.

        } catch(err) {
            next(err);

        } finally {
            pool.releaseConnection(connection);
            return result;
        }

    },

    //파라미터가 있는 SQL 문
    queryParamArr : async (...args) => {

        const query = args[0];
        const value = args[1];
        let result;

        try {
            var connection = await pool.getConnection();// connection을 pool에서 하나 가져온다.
            result = await connection.query(query, value) || null;	// 두 번째 parameter에 배열 => query문에 들어갈 runtime 시 결정될 value

        } catch(err) {
            next(err);

        } finally {
            pool.releaseConnection(connection);
            return result;
        }
    }
};