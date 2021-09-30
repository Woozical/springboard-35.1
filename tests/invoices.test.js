process.env.NODE_ENV = "test";
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testComp1, testComp2, testInv1, testInv2;

beforeEach(async () => {
    // seed testing data
    const result = await db.query(
        `INSERT INTO companies VALUES ('apple', 'Apple Computer', 'Maker of OSX.'), ('ibm', 'IBM', 'Big blue.') RETURNING *`
    );
    const invResult = await db.query(
        `INSERT INTO invoices (comp_code, amt) VALUES ('apple', 100), ('apple', 5000) RETURNING *`
    );
    [testComp1, testComp2] = result.rows;
    [testInv1, testInv2] = invResult.rows;
});

afterEach (async () => {
    // clear testing data
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM invoices');
});

afterAll(async () => {
    // close db connection
    await db.end();
});

describe('GET /invoices', () => {
    test('Should respond with all invoices in db', async () => {
        const res = await request(app).get('/invoices');
        expect(res.statusCode).toBe(200);
        expect(res.body.invoices[0].id).toEqual(testInv1.id);
        expect(res.body.invoices[1].id).toEqual(testInv2.id);
    });
});

describe('GET /invoices/:id', () => {
    test('Should respond with data on given invoice', async () => {
        const res = await request(app).get(`/invoices/${testInv1.id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.invoice.amt).toEqual(testInv1.amt);
        expect(res.body.invoice.company.code).toEqual(testInv1.comp_code);
    });
    test('Should respond with 404 code on invalid id', async () => {
        const res = await request(app).get('/invoices/-1');
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /invoices', () => {
    test('Should create new invoice entry in db', async () => {
        const data = {comp_code: 'apple', amt: 700};
        const res = await request(app).post('/invoices').send(data);
        expect(res.statusCode).toBe(201);
        const query = await db.query(`SELECT * FROM invoices WHERE id = $1`, [res.body.invoice.id]);
        expect(query.rows[0].comp_code).toEqual(data.comp_code);
        expect(query.rows[0].amt).toEqual(data.amt);
    });
    test("Should respond with 400 code if missing fields", async () => {
        const data = {comp_code: 'apple'};
        const res = await request(app).post('/invoices').send(data);
        expect(res.statusCode).toBe(400);
    });
    test("Should respond with 400 code if request payload has unexpected data types", async () => {
        const data = {comp_code:'apple', amt: 'a lot'};
        const res = await request(app).post('/invoices').send(data);
        expect(res.statusCode).toBe(400);
    });
});

describe('PUT /invoices/:id', () => {
    test('Should update an existing invoice in db with new data', async () => {
        const data = {amt: 9001};
        const res = await request(app).put(`/invoices/${testInv1.id}`).send(data);
        expect(res.statusCode).toBe(200);
        const query = await db.query('SELECT * FROM invoices WHERE id = $1', [testInv1.id]);
        expect(query.rows[0].amt).not.toEqual(testInv1.amt);
        expect(query.rows[0].amt).toEqual(data.amt);
    });
    test('Should respond with 404 if invalid id', async () => {
        const res = await request(app).put('/invoices/-1').send({amt: 500});
        expect(res.statusCode).toBe(404);
    });
    test('Should respond with 400 if missing fields', async () => {
        const data = {message: "I don't know what I'm doing"};
        const res = await request(app).put(`/invoices/${testInv1.id}`).send(data);
        expect(res.statusCode).toBe(400);
        // DB should not be updated
        const query = await db.query('SELECT * FROM invoices WHERE id = $1', [testInv1.id]);
        expect(query.rows[0].amt).toEqual(testInv1.amt);
    });
    test("Should respond with 400 code if request payload has unexpected data types", async () => {
        const data = {amt:'a lot more than before'};
        const res = await request(app).put(`/invoices/${testInv1.id}`).send(data);
        expect(res.statusCode).toBe(400);
        // DB should not be updated
        const query = await db.query('SELECT * FROM invoices WHERE id = $1', [testInv1.id]);
        expect(query.rows[0].amt).not.toEqual(data.amt);
    });
});

describe('DELETE /invoices/:id', () => {
    test('Should delete the entry from db', async () => {
        const res = await request(app).delete(`/invoices/${testInv1.id}`);
        expect(res.statusCode).toBe(200);
        const query = await db.query('SELECT * FROM invoices WHERE id = $1', [testInv1.id]);
        expect(query.rowCount).toBe(0);
    });
    test('Should respond with 404 if invalid code', async () => {
        const res = await request(app).delete('/invoices/-1');
        expect(res.statusCode).toBe(404);
    });
})