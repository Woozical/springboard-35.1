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
        `INSERT INTO invoices (comp_code, amt) VALUES ('apple', 100), ('apple', 5000) RETURNING id, amt`
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

describe('GET /companies', () => {
    test("Should return all companies in db", async () => {
        const res = await request(app).get('/companies');
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toEqual([testComp1, testComp2]);
    });
});

describe('GET /companies/:code', () => {
    test("Should return data on company with given code", async () => {
        const res = await request(app).get(`/companies/${testComp2.code}`);
        expect(res.statusCode).toBe(200);
        for (let key in testComp2){
            expect(res.body.company[key]).toEqual(testComp2[key]);
        }
    });
    test("Should include data on company's invoices", async () => {
        const res = await request(app).get(`/companies/${testComp1.code}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.company.invoices[0].id).toEqual(testInv1.id);
        expect(res.body.company.invoices[1].id).toEqual(testInv2.id);
    });
    test("Should respond with 404 if invalid code", async () => {
        const res = await request(app).get('/companies/flaergaergnaoign');
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /companies', () => {
    test("Should create new company entry in db", async () => {
        const data = {code: 'valve', name:'Valve Corporation', description:'Will at some point release HL3'};
        const res = await request(app).post('/companies').send(data);
        expect(res.statusCode).toBe(201);
        const query = await db.query('SELECT * FROM companies WHERE code = $1', [data.code]);
        expect(query.rows[0]).toEqual(data);
    });
    test("Should respond with 400 code if missing fields", async () => {
        const data = {name: 'Dropbox', description: 'Cloud storage'};
        const res = await request(app).post('/companies').send(data);
        expect(res.statusCode).toBe(400);
    });
    test("Should respond with 400 code if request payload has unexpected data types", async () => {
        const data = {code: 'amzn', name:'Amazon', description: 105};
        const res = await request(app).post('/companies').send(data);
        expect(res.statusCode).toBe(400);
    });
    // test("Should respond with 400 code if company code already in db", async () => {
    //     const data = {code:'apple', name:'New Apple', description:'AKA Apple 2.0'}
    //     const res = await request(app).post('/companies').send(data);
    //     expect(res.statusCode).toBe(400);
    // })
});

describe('PUT /companies/:code', () => {
    test('Should update an existing company in db with new data', async () => {
        const data = {name: 'Apple 2.0', description: 'New and improved!'};
        const res = await request(app).put(`/companies/${testComp1.code}`).send(data);
        expect(res.statusCode).toBe(200);
        const query = await db.query('SELECT * FROM companies WHERE code = $1', [testComp1.code]);
        expect(query.rows[0].name).not.toEqual(testComp1.name);
        expect(query.rows[0].description).not.toEqual(testComp1.description);
        expect(query.rows[0].name).toEqual(data.name);
        expect(query.rows[0].description).toEqual(data.description)
    });
    test('Should respond with 404 if invalid code', async () => {
        const res = await request(app).put('/companies/anageunge').send({name:'New name', description:'New description'});
        expect(res.statusCode).toBe(404);
    });
    test('Should respond with 400 if missing fields', async () => {
        const data = {name: 'New Apple Name'};
        const res = await request(app).put(`/companies/${testComp1.code}`).send(data);
        expect(res.statusCode).toBe(400);
        // DB should not be updated
        const query = await db.query('SELECT * FROM companies WHERE code = $1', [testComp1.code]);
        expect(query.rows[0].name).not.toEqual(data.name);
    });
    test("Should respond with 400 code if request payload has unexpected data types", async () => {
        const data = {name:2.0, description: 'New and improved!'};
        const res = await request(app).put(`/companies/${testComp1.code}`).send(data);
        expect(res.statusCode).toBe(400);
        // DB should not be updated
        const query = await db.query('SELECT * FROM companies WHERE code = $1', [testComp1.code]);
        expect(query.rows[0].name).not.toEqual(data.name);
    });
});

describe('DELETE /companies/:code', () => {
    test('Should delete the entry from db', async () => {
        const res = await request(app).delete(`/companies/${testComp1.code}`);
        expect(res.statusCode).toBe(200);
        const query = await db.query('SELECT * FROM companies WHERE code = $1', [testComp1.code]);
        expect(query.rowCount).toBe(0);
    });
    test('Should respond with 404 if invalid code', async () => {
        const res = await request(app).delete('/companies/laiernaoih');
        expect(res.statusCode).toBe(404);
    });
})