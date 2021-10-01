const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

function validateNewPOST(req, res, next){
    const json = req.body;
    const errors = [];
    // Field checking
    if (!json.code) errors.push('code ');
    if (!json.industry) errors.push('industry ');
    if (errors.length > 0){
        return next(new ExpressError(`Missing fields: ${errors}`, 400));
    }
    // Type checking
    if (typeof json.code !== 'string') errors.push("'code' field must be of type string");
    if (typeof json.industry !== 'string') errors.push("'industry' field must be of type string");
    if (errors.length > 0){
        return next(new ExpressError(`Type errors: ${errors}`, 400));
    }

    return next();
}

function validateRelPOST(req, res, next){
    const json = req.body;
    if (json.comp_code === undefined)
    return next(new ExpressError("Missing field: 'comp_code'", 400));

    if (typeof json.comp_code !== 'string')
    return next(new ExpressError("Type error: 'comp_code' field must be of type string", 400));

    return next();
}

router.get('/', async (req, res, next) => {
    try{
        const result = await db.query('SELECT * FROM industries');
        return res.json({industries: result.rows});
    } catch (err) {
        return next(err);
    }
});

router.get('/:code', async (req, res, next) => {
    try{
        const result = await db.query(
            `SELECT industries.code, industries.industry, companies.code AS comp_code, companies.name, companies.description
            FROM industries
            FULL JOIN companies_industries ON industries.code = companies_industries.ind_code
            FULL JOIN companies ON companies.code = companies_industries.comp_code
            WHERE industries.code = $1`, [req.params.code]
        );
        if (result.rowCount < 1) return next(); // Continue to 404 handler

        // Build response JSON
        const {code, industry} = result.rows[0];
        const resObj = {code, industry, companies: []};
        for (let {comp_code, name, description} of result.rows){
            if (comp_code !== null) resObj.companies.push({code: comp_code, name, description});
        }

        return res.json({industry : resObj });
    } catch (err) {
        return next(err);
    }
});

router.post('/', validateNewPOST, async (req, res, next) => {
    try{
        const {code, industry} = req.body;
        const result = await db.query(
            'INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING *',
            [code, industry]
        );
        return res.status(201).json({company: result.rows[0]});
    } catch (err) {
        return next(err);
    }
});

// Should return 404 on invalid foreign key(s), handle this in validateRelPOST?
router.post('/:code/companies', validateRelPOST, async (req, res, next) => {
    try{
        const {comp_code} = req.body;
        const result = await db.query(
            'INSERT INTO companies_industries (comp_code, ind_code) VALUES ($1, $2) RETURNING *',
            [comp_code, req.params.code]
        );
        if (result.rowCount < 1) return next(); // Continue to 404 handler
        return res.status(200).json({msg: `Success. Associated company '${comp_code}' with industry '${req.params.code}'`});
    } catch (err) {
        return next(err);
    }
})

module.exports = router;