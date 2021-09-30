/** Database setup for BizTime. */
const { Client } = require('pg');
const connectionString = process.env.NODE_ENV === "test" ?
'postgresql:///biztime_test' : 'postgresql:///biztime';

const db = new Client({ connectionString });
db.connect();

module.exports = db;