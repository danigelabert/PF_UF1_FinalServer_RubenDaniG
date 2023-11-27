const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:4200",
    },
});

let counter;
let counterActualitzat;

app.get('/', (req, res) => {
    res.send('<h1>Servidor Node.js con Socket.IO</h1>');
});

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado: ' + socket.id);

    socket.on('sendPIN', () => {
        counter = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000
        counterActualitzat=counter;
        // Lógica para incrementar el contador
        console.log('Incrementando el contador: ' + socket.id);
        // Puedes emitir el nuevo valor del contador a todos los clientes
        io.emit('counter', counter);
        console.log('Incrementando el contadorrr: ' + counter);

    });

    socket.on('enviarPIN', (data) => {
        console.log("Click!");
        console.log('Variable recibida desde el cliente:', data);
        if (data == counterActualitzat) {
            io.emit('reproduirVideo', true);
            console.log("Son iguals")
        }
        else {
            console.log("NO son iguals")
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
