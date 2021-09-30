const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

function validatePOST(req, res, next){
    const json = req.body;
    const errors = [];
    // Field checking
    if (!json.code) errors.push('code ');
    if (!json.name) errors.push('name ');
    if (!json.description) errors.push('description ');
    if (errors.length > 0){
        return next(new ExpressError(`Missing fields: ${errors}`, 400));
    }
    // Type checking
    if (typeof json.code !== 'string') errors.push("'code' field must be of type string");
    if (typeof json.name !== 'string') errors.push("'name' field must be of type string");
    if (typeof json.description !== 'string') errors.push("'description' field must be of type string");
    if (errors.length > 0){
        return next(new ExpressError(`Type errors: ${errors}`, 400));
    }

    return next();
}

function validatePUT(req, res, next){
    const json = req.body;
    const errors = [];
    // Field checking
    if (!json.name) errors.push('name ');
    if (!json.description) errors.push('description ');
    if (errors.length > 0){
        return next(new ExpressError(`Missing fields: ${errors}`, 400));
    }
    // Type checking
    if (typeof json.name !== 'string') errors.push("'name' field must be of type string");
    if (typeof json.description !== 'string') errors.push("'description' field must be of type string");
    if (errors.length > 0){
        return next(new ExpressError(`Type errors: ${errors}`, 400));
    }

    return next();
}

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
        if (result.rows[0]) return res.json({company: result.rows[0]});
        else return next() // Continue to 404 handler
    } catch (err) {
        return next(err);
    }
});

router.post('/', validatePOST, async (req, res, next) => {
    try{
        const {code, name, description} = req.body;
        const result = await db.query(
            'INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description',
            [code, name, description]
        );
        return res.status(201).json({company: result.rows[0]});
    } catch (err) {
        return next(err);
    }
});

router.put('/:code', validatePUT, async (req, res, next) => {
    try{
        const {name, description} = req.body;
        const result = await db.query(
            'UPDATE companies SET name = $1, description = $2 WHERE code = $3 RETURNING code, name, description',
            [name, description, req.params.code]
        );
        if (result.rows[0]) return res.json({company: result.rows[0]});
        else return next(); // Continue to 404 handler
    } catch (err) {
        return next(err);
    }
});

router.delete('/:code', async (req, res, next) => {
    try{
        const result = await db.query(
            'DELETE FROM companies WHERE code = $1', [req.params.code]
        );
        if (result.rowCount > 0) return res.json({status:'deleted'});
        else return next();
    } catch (err) {
        return next(err);
    }
})

module.exports = router;