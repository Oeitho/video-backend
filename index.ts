import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
const pgp = require('pg-promise')();
const cors = require('cors');
const bodyParser = require('body-parser');

const port = process.env.PORT || 8080;

const db = pgp(process.env.DATABASE_URL);

const app: express.Application = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const video = {
    current: 'https://www.youtube.com/watch?v=qjG7TqoQog4'
};

wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
        const json = JSON.parse(message);
        if (json.command ==='url') {
            video.current = json.payload.url;
        }
        wss.clients
            .forEach(client => {
                client.send(`${message}`);
            });
    });
});

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => { res.set('Content-Type', 'application/json'); next(); });

const isNotDefinedString = (value: string | string[] | undefined) => {
    return Array.isArray(value) || value === undefined;
}

const randomString = (length: number, digits: boolean) => {
    let result = '';
    let SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUV';
    if (digits) SYMBOLS += '1234567890'
    for (let i = 0; i < length; i++) {
        result += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }
    return result;
}

app.route('/')
    .get((req, res) => {
        res.send('Hello world');
    })

const broadcase_message = async (user_id: string, message: string, result: { id: any }) => {
    wss.clients
        .forEach(client => {
            client.send(JSON.stringify({
                command: 'chat',
                    payload: {
                        message: {
                            chat_message: message,
                            id: result.id,
                            user_id: user_id
                        }
                    }
            }));
        })
}

const author_verified = async (req: any, res: any, user_id: string) => { 
    const body = req.body;
    const message = body.message;
    if (user_id && message === null) {
        res.status(403).send();
        return;
    }
    await db.one("INSERT INTO message (user_id, chat_message) VALUES ($1, $2) RETURNING id", [user_id, message])
        .then((result: { id: any }) => {
            broadcase_message(user_id, message, result)
            res.send();
        });
}

app.route('/chat')
    .get(async(req, res) => {
        await db.any("SELECT chat_message, id, user_id FROM message ORDER BY id DESC LIMIT 50")
            .then((data: { chat_message: string, id: number, user_id: number }) => res.send({ messages: data }));
    })
    .post(async(req, res) => {
        const user_id = req.headers.id;
        const secret = req.headers.secret;
        if (isNotDefinedString(user_id) || isNotDefinedString(secret)) res.status(401).send();
        else await db.one('SELECT name FROM author WHERE id = $1 AND secret = $2', [user_id, secret])
            // @ts-ignore user_id must be string because of the isNotDefinedString test
            .then(() => author_verified(req, res, user_id))
            .catch(() => res.status(401).send);
    });

app.route('/author')
    .get(async (req, res) => {
        await db.any("SELECT name, id FROM author")
            .then((data: any) => res.send({ authors: data }))
            .catch(() => res.status(404).send());
    })
    .post(async (req, res) => {
        const name = randomString(10, false);
        const secret = randomString(100, true);
        await db.one("INSERT INTO author (secret, name) VALUES ($1, $2) RETURNING id", [secret, name])
            .then((result: { id: any }) => { 
                const id = result.id;
                res.send({
                    'id': id,
                    'secret': secret,
                    'name': name
                })
             })
            .catch((error: any) => console.log(`Error: ${error}`));
    });

app.route('/author/self')
    .get(async (req, res) => {
        const user_id = req.headers.id;
        const secret = req.headers.secret;
        if (isNotDefinedString(user_id) || isNotDefinedString(secret)) res.status(403).send();
        await db.one('SELECT name FROM author WHERE id = $1 AND secret = $2', [user_id, secret])
            .then(() => res.send())
            .catch(() => res.status(403).send());
    });


app.route('/author/:id')
    .patch(async (req, res) => {
        const body = req.body;
        const name = body.name;
        const id = req.params.id;
        const secret = req.headers.secret;
        if (parseInt(id) === NaN || isNotDefinedString(name) || isNotDefinedString(secret) || name === 'Unknown author') res.status(401).send();
        else await db.one('UPDATE author SET name = $1 WHERE id = $2 AND secret = $3 RETURNING name', [name, id, secret])
            .then(() => { 
                res.send();
             })
            .catch((error: any) => { console.error(error); res.status(401).send() });
    })
    .get(async (req, res) => {
        const id = req.params.id;
        if (parseInt(id) === NaN) res.status(401).send();
        else await db.one('SELECT name FROM author WHERE id = $1', id)
            .then((data: {name: string}) => {
                res.send(data.name)
            })
            .catch(() => res.status(401).send);
    });

app.route('/video')
    .get((req, res) => {
        res.send(video);
    });

server.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});
