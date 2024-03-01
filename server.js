const express = require('express');
const http = require('http');
const fs = require('fs');
const mysql = require('mysql');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Importa jsonwebtoken

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:4200",
    },
});
let tokenKeeper = '';
let userValid = false;
let counter = 0;
let counterActualizado = 0;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'daniruben',
    password: 'P@tata123',
    database: 'pfdaniruben'
});

db.connect();

app.use(cors());
app.use(bodyParser.json());

const JWT_Secret = 'P@tata123';

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === tokenKeeper) {
        userValid = true;
        next();
    } else {
        userValid = false;
        console.log('Token inválido');
    }
};

app.post('/login', (req, res) => {
    if (req.body) {
        const { username, password } = req.body;
        const query = `SELECT * FROM usuarios WHERE username='${username}' AND password='${password}'`;

        db.query(query, (err, result) => {
            if (err) {
                res.status(500).json({ error: 'Error en el servidor' });
                return;
            }

            if (result.length > 0) {
                const user = result[0];
                // Generar token JWT con tiempo de expiración
                const token = jwt.sign({ username: user.username, premium: user.premium }, JWT_Secret, { expiresIn: '1h' });
                res.status(200).send({
                    signed_user: user,
                    token: token,
                    premium: user.premium
                });
                console.log("JWT generado correctamente");
                console.log("Premium:", user.premium);
                tokenKeeper = token;
            } else {
                res.status(403).send({
                    errorMessage: 'Autorización requerida!'
                });
            }
        });
    } else {
        res.status(403).send({
            errorMessage: 'Por favor, proporciona un usuario y contraseña'
        });
    }
});

app.get('/videos/auron', (req, res) => {
    const videoPath = 'videos/auron.mp4';
    streamVideo(req, res, videoPath);
});

app.get('/videos/premium', (req, res) => {
    const videoPath = 'videos/premium.mp4';
    streamVideo(req, res, videoPath);
});

app.get('/videos/ibai', (req, res) => {
    const videoPath = 'videos/ibai.mp4';
    streamVideo(req, res, videoPath);
});

app.get('/videos/illo', (req, res) => {
    const videoPath = 'videos/illoJuan.mp4';
    streamVideo(req, res, videoPath);
});

function streamVideo(req, res, videoPath) {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };

        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
}

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado: ' + socket.id);

    socket.on('sendPIN', () => {
        counter = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
        counterActualizado = counter;
        io.emit('counter', counter);
        console.log('Incrementando el contador: ' + counter);
    });

    socket.on('enviarPIN', (data) => {
        console.log("Click!");
        console.log('Variable recibida desde el cliente:', data);
        if (data == counterActualizado) {
            io.emit('reproduirVideo', true);
            console.log("Son iguales");
        } else {
            console.log("NO son iguales");
        }
    });

    socket.on('videoRequest', verifyToken, (videoPath) => {
        if (userValid) {
            console.log("Solicitud de video recibida: " + videoPath);
            const videoStream = fs.createReadStream(videoPath, { highWaterMark: 1024 * 1024 });

            videoStream.on('data', (chunk) => {
                socket.emit('videoChunk', chunk);
            });

            videoStream.on('end', () => {
                socket.emit('videoEnd');
            });

            videoStream.on('error', (error) => {
                console.error("Error al leer el video:", error);
                socket.emit('videoError', error.message);
            });
        } else {
            console.log("Token inválido. Acceso denegado.");
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor Socket.IO escuchando en el puerto ${PORT}`);
});
