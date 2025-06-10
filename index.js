const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'pass',
    database: 'todolist',
};

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

async function updateItemInDatabase(id, text) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
    await connection.end();
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr id="row-${item.id}">
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button onclick="enableEdit(${item.id}, '${item.text.replace(/'/g, "\\'")}')">Edit</button></td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    if (req.method === 'GET' && req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'),
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            res.writeHead(500);
            res.end('Error loading HTML');
        }

    } else if (req.method === 'POST' && req.url === '/edit') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id, text } = JSON.parse(body);
                if (id && text && typeof text === 'string') {
                    await updateItemInDatabase(id, text);
                    res.writeHead(200);
                    res.end('Item updated');
                } else {
                    res.writeHead(400);
                    res.end('Invalid input');
                }
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end('Server error');
            }
        });

    } else {
        res.writeHead(404);
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
