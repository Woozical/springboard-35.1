const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

function validatePOST(req, res, next){
    const json = req.body;
    const errors = [];
    // Field checking
    if (!json.comp_code) errors.push('comp_code ');
    if (!json.amt) errors.push('amt ');
    if (errors.length > 0){
        return next(new ExpressError(`Missing fields: ${errors}`, 400));
    }
    // Type checking
    if (typeof json.comp_code !== 'string') errors.push("'comp_code' field must be of type string");
    if (typeof json.amt !== 'number') errors.push("'amt' field must be of type number");
    if (errors.length > 0){
        return next(new ExpressError(`Type errors: ${errors}`, 400));
    }

    return next();
}

function validatePUT(req, res, next){
    const json = req.body;
    // Field checking
    if (!json.amt) return next(new ExpressError(`Missing field: amt`, 400));
    // Type checking
    if (typeof json.amt !== 'number') return next(new ExpressError(`Type error: amt must be of type number`, 400));

    return next();
}

router.get('/', async (req, res, next) => {
    try{
        const results = await db.query('SELECT * FROM invoices');
        return res.json({invoices: results.rows});
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try{
        const result = await db.query(
            `SELECT * FROM invoices
            JOIN companies ON invoices.comp_code = companies.code
            WHERE invoices.id = $1`, [req.params.id]
        );
        if (!result.rows[0]) return next() // Continue to 404 handler
        const {id, amt, paid, add_date, paid_date, code, name, description} = result.rows[0];
        const resObj = {id, amt, paid, add_date, paid_date, company : {code, name, description}};
        return res.json({invoice: resObj});
    } catch (err) {
        return next(err);
    }
});

router.post('/', validatePOST, async (req, res, next) => {
    try{
        const {comp_code, amt} = req.body;
        const result = await db.query(
            `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        );
        return res.status(201).json({invoice: result.rows[0]});
    } catch (err) {
        return next(err);
    }
});

router.put('/:id', validatePUT, async (req, res, next) => {
    try{
        const { amt } = req.body;
        const result = await db.query(
            `UPDATE invoices SET amt = $1 WHERE id = $2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, req.params.id]
        );
        if (result.rows[0]) return res.json({invoice: result.rows[0]});
        else return next(); // Continue to 404 handler
    } catch (err) {
        return next(err);
    }
});

router.delete('/:id', async (req, res, next) => {
    try{
        const result = await db.query(
            'DELETE FROM invoices WHERE id = $1', [req.params.id]
        );
        if (result.rowCount > 0) return res.json({status:'deleted'});
        else return next();
    } catch (err) {
        return next(err);
    }
});

module.exports = router;