const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require("fs");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:4200",
    },
});

let counter;
let counterActualizado;

app.get('/', (req, res) => {
    res.send('<h1>Servidor Node.js con Socket.IO</h1>');
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

app.get('/videos/auron', (req, res) => {
    const videoPath = 'videos/auron.mp4';
    streamVideo(req, res, videoPath);
});

app.get('/videos/illo', (req, res) => {
    const videoPath = 'videos/illoJuan.mp4';
    streamVideo(req, res, videoPath);
});

app.get('/videos/ibai', (req, res) => {
    const videoPath = 'videos/ibai.mp4';
    streamVideo(req, res, videoPath);
});


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

    socket.on('videoRequest', (videoPath) => {
        console.log("Solicitud de video recibida: " + videoPath);
        const videoStream = fs.createReadStream( videoPath, { highWaterMark: 1024 * 1024 });

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
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Servidor Socket.IO escuchando en el puerto ${PORT}`);
});
