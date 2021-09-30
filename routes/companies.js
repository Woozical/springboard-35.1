const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

// router.get('/', (req, res, next) => {
//     db.query('SELECT * FROM companies')
//     .then( (results) => {
//         return res.json({companies: results.rows});
//     })
//     .catch( (err) => {
//         return next(err)
//     });
// });

router.get('/', async (req, res, next) => {
    try{
        const results = await db.query('SELECT * FROM companies');
        return res.json({companies: results.rows});
    } catch (err) {
        next(err);
    }
});

router.get('/:code', async (req, res, next) => {
    try{
        const result = await db.query('SELECT * FROM companies WHERE code = $1', [req.params.code]);
        if (result.rows[0]) return res.json(result.rows[0])
        else return next() // Continue to 404 handler
    } catch (err) {
        return next(err);
    }
});



module.exports = router;