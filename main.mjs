import process from "node:process";
import { createPool } from "mariadb";
import pg from "pg";

const MARIADB_HOST = process.env["MARIADB_HOST"],
    MARIADB_PORT = process.env["MARIADB_PORT"],
    MARIADB_USER = process.env["MARIADB_USER"],
    MARIADB_PASSWORD = process.env["MARIADB_PASSWORD"],
    MARIADB_DATABASE = process.env["MARIADB_DATABASE"],
    MARIADB_TABLE = process.env["MARIADB_TABLE"];

const PG_HOST = process.env["PG_HOST"],
    PG_PORT = process.env["PG_PORT"],
    PG_USER = process.env["PG_USER"],
    PG_PASSWORD = process.env["PG_PASSWORD"],
    PG_DATABASE = process.env["PG_DATABASE"],
    PG_TABLE = process.env["PG_TABLE"];

const { Client } = pg,
    mariadbPool = createPool({
        host: MARIADB_HOST,
        port: parseInt(MARIADB_PORT),
        user: MARIADB_USER,
        password: MARIADB_PASSWORD,
        database: MARIADB_DATABASE
    }),
    pgClient = new Client({
        host: PG_HOST,
        port: parseInt(PG_PORT),
        user: PG_USER,
        password: PG_PASSWORD,
        database: PG_DATABASE
    });

const transferData = async () => {

    let mariadbConnexion = await mariadbPool.getConnection();
    try {
        await pgClient.connect();
        await pgClient.query('BEGIN');
        
        const stream = mariadbConnexion.queryStream(`SELECT * FROM ${MARIADB_TABLE}`);
        
        for await (const row of stream) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const query = `
            INSERT INTO ${PG_TABLE} (${keys.join(', ')})
            VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
          `;
            await pgClient.query(query, values);
        }

        await pgClient.query('COMMIT');
        console.log('Data transfer complete...');
    } catch (error) {
        console.error('Error transferring data:', error);
        await pgClient.query('ROLLBACK');
    } finally {
        if (mariadbConnexion) mariadbConnexion.release();
        await pgClient.end();
        process.exit(0);
    }
}

transferData();