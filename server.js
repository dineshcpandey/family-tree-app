// server.js (Node.js with Express)
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5050;

// Middleware - Make sure CORS is applied before other middleware
app.use(cors({
    origin: '*', // Allow all origins during development - change to specific origin in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} request to ${req.url}`);
    next();
});

// Add body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add a simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// PostgreSQL connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'networkdb',
    password: 'postgres',
    port: 5432,
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully!');
    }
});

// API Routes

// Get all people
app.get('/api/people', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM network.person ORDER BY personname');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching people:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get a single person by ID
app.get('/api/people/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM network.person WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching person:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Search people by name or location
app.get('/api/search', async (req, res) => {
    try {
        console.log('Search query parameters:', req.query);
        const { term, field } = req.query;

        if (!term) {
            const allPeople = await pool.query('SELECT * FROM network.person ORDER BY personname');
            return res.json(allPeople.rows);
        }

        let query;
        let params = [];

        if (field === 'personname') {
            query = 'SELECT * FROM network.person WHERE name ILIKE $1 ORDER BY name';
            params = [`%${term}%`];
        } else if (field === 'location') {
            query = 'SELECT * FROM network.person WHERE currentlocation ILIKE $1 ORDER BY personname';
            params = [`%${term}%`];
        } else {
            // Search both name and location
            query = 'SELECT * FROM network.person WHERE personname ILIKE $1 OR currentlocation ILIKE $1 ORDER BY personname';
            params = [`%${term}%`];
        }

        console.log('Executing query:', query, 'with params:', params);
        const result = await pool.query(query, params);
        console.log('Query result rows:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching people:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Add a new person
app.post('/api/people', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { name, birthdate, fatherid, motherid, spouseid, gender, currentlocation } = req.body;
        console.log('Adding person:', req.body);

        // Validate the required fields
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Get the next available ID - check if this function exists
        let newId;
        try {
            const idResult = await client.query('SELECT network.get_next_person_id() as next_id');
            newId = idResult.rows[0].next_id;
        } catch (error) {
            console.error('Error getting next ID:', error);
            // Fallback to a manual ID generation if the function doesn't exist
            const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM network.person');
            newId = (maxIdResult.rows[0].max_id || 0) + 1;
        }

        // Insert the new person
        const insertResult = await client.query(
            'INSERT INTO network.person (id, personname, birthdate, fatherid, motherid, spouseid, gender, currentlocation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [newId, name, birthdate, fatherid || null, motherid || null, spouseid || null, gender, currentlocation]
        );

        // Update spouse's spouseid if applicable
        if (spouseid) {
            await client.query(
                'UPDATE network.person SET spouseid = $1 WHERE id = $2',
                [newId, spouseid]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(insertResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding person:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        client.release();
    }
});

// Update an existing person
app.put('/api/people/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { name, birthdate, fatherid, motherid, spouseid, gender, currentlocation } = req.body;

        // Check if person exists
        const checkResult = await client.query('SELECT * FROM network.person WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Get the current spouse ID before updating
        const oldSpouseId = checkResult.rows[0].spouseid;

        // Update the person
        const updateResult = await client.query(
            `UPDATE network.person 
       SET name = $1, birthdate = $2, fatherid = $3, motherid = $4, spouseid = $5, gender = $6, currentlocation = $7 
       WHERE id = $8 RETURNING *`,
            [name, birthdate, fatherid || null, motherid || null, spouseid || null, gender, currentlocation, id]
        );

        // If old spouse exists, remove this person as their spouse
        if (oldSpouseId && oldSpouseId !== spouseid) {
            await client.query(
                'UPDATE network.person SET spouseid = NULL WHERE id = $1',
                [oldSpouseId]
            );
        }

        // Update new spouse's spouseid if applicable
        if (spouseid) {
            await client.query(
                'UPDATE network.person SET spouseid = $1 WHERE id = $2',
                [id, spouseid]
            );
        }

        await client.query('COMMIT');
        res.json(updateResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating person:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        client.release();
    }
});

// Delete a person
app.delete('/api/people/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Check if person exists
        const checkResult = await client.query('SELECT * FROM network.person WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const person = checkResult.rows[0];

        // Update spouse if exists
        if (person.spouseid) {
            await client.query(
                'UPDATE network.person SET spouseid = NULL WHERE id = $1',
                [person.spouseid]
            );
        }

        // Set fatherid/motherid to NULL for any children
        await client.query(
            'UPDATE network.person SET fatherid = NULL WHERE fatherid = $1',
            [id]
        );

        await client.query(
            'UPDATE network.person SET motherid = NULL WHERE motherid = $1',
            [id]
        );

        // Delete the person
        await client.query('DELETE FROM network.person WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ message: 'Person deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting person:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        client.release();
    }
});

// Get family network data for a person
app.get('/api/people/:id/network', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if person exists
        const personResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [id]);
        if (personResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const person = personResult.rows[0];

        // Get parents
        const parentsQuery = `
            SELECT * FROM network.person 
            WHERE id = $1 OR id = $2
        `;
        const parentsResult = await pool.query(parentsQuery, [person.fatherid, person.motherid]);
        const parents = parentsResult.rows;

        // Get spouse
        let spouse = null;
        if (person.spouseid) {
            const spouseResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [person.spouseid]);
            if (spouseResult.rows.length > 0) {
                spouse = spouseResult.rows[0];
            }
        }

        // Get children
        const childrenQuery = `
            SELECT * FROM network.person 
            WHERE fatherid = $1 OR motherid = $1
        `;
        const childrenResult = await pool.query(childrenQuery, [id]);
        const children = childrenResult.rows;

        // Get siblings (people who share at least one parent with the person)
        const siblingsQuery = `
            SELECT * FROM network.person 
            WHERE id != $1 AND (
                (fatherid IS NOT NULL AND fatherid = $2) OR 
                (motherid IS NOT NULL AND motherid = $3)
            )
        `;
        const siblingsResult = await pool.query(siblingsQuery, [id, person.fatherid, person.motherid]);
        const siblings = siblingsResult.rows;

        // Get grandparents
        const grandparentsQuery = `
            SELECT gp.* FROM network.person gp
            WHERE gp.id IN (
                SELECT p.fatherid FROM network.person p WHERE p.id IN ($1, $2)
                UNION
                SELECT p.motherid FROM network.person p WHERE p.id IN ($1, $2)
            )
        `;
        const grandparentsResult = await pool.query(grandparentsQuery, [person.fatherid, person.motherid]);
        const grandparents = grandparentsResult.rows;

        // Get grandchildren
        const grandchildrenQuery = `
            SELECT gc.* FROM network.person gc
            WHERE 
                gc.fatherid IN (SELECT id FROM network.person WHERE fatherid = $1 OR motherid = $1)
                OR
                gc.motherid IN (SELECT id FROM network.person WHERE fatherid = $1 OR motherid = $1)
        `;
        const grandchildrenResult = await pool.query(grandchildrenQuery, [id]);
        const grandchildren = grandchildrenResult.rows;

        // Return all family data
        res.json({
            person,
            parents,
            //  grandparents,
            spouse,
            children,
            grandchildren,
            siblings
        });
    } catch (error) {
        console.error('Error fetching family network:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Start the server - add '0.0.0.0' to listen on all interfaces
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;