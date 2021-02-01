/*

With web sockets we have full duplex communication (bi-directional coms)
client can initiate with server and vice versa
With http on the other hand, the client had to make requests and 
the server would respond. It could not go the other way

With a web socket, we have a persistant connection, so the client
connects and stays connected for as long as they need. So the client
could send messages to the server, and the server to the client

Websocket is a separate protocol from HTTP

*/

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
// Destructuring
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();

// creates an express server. This happens behind the scenes anyway
const server = http.createServer(app);

// configures socket.io to work with your raw http server
// that's why we had to create our own server because when
// express does it behind the scenes, we don't have access
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// io.on is only used for connections
io.on('connection', (socket) => {
    socket.emit('message', {
        text: 'Welcome to the chat room',
        createdAt: new Date().getTime()
    });

    // Listener for joining a chat room
    socket.on('join', ({username, room}, callback) => {
        // function will return either an error or a success
        const { error, user } = addUser({ id: socket.id, username, room });
        if(error) {
            return callback(error);
        }

        // use a method we can only use on the server
        // socket.join allows us to join a chat room, pass in the room
        // this is another way to emit events, where we only emit them to
        // that specific room
        // socket.emit (specific client)
        // io.emit (sends to all clients)
        // socket.broadcast.emit (sends all clients except one)
        // io.to.emit (emits event to everyone in a specific room)
        // socket.broadcast.to.emit (same as above except the current connection)
        socket.join(user.room);
        socket.emit('message', generateMessage('System', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('System', `${user.username} has joined!`));
        // For a list of users to display
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        // call the callback, letting the client know they were able to join
        // not sending in an error, so it won't spit out an error
        callback();
    });

    socket.on('sendMessage', (messageVar, callback) => {
        const filter = new Filter();

        // get the user data
        const user = getUser(socket.id);

        if(filter.isProfane(messageVar)) {
            return callback('Profanity is not allowed');
        }

        io.to(user.room).emit('message', generateMessage(user.username, messageVar));
        callback();
    })

    // listener for when a user sends their location
    socket.on('sendLocation', (coords, callback) => {
        // get user data
        const user = getUser(socket.id);
        // This emit is a different event. It's not a message event, it's 
        // locationMessage. This is so we can customize the output when
        // sharing locations rather than just use the general message format
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    // this code will run whenever the client disconnects
    socket.on('disconnect', () => {
        // returns user that was removed or undefined 
        const user = removeUser(socket.id);
        // there's a chance that the person disconnecting never joined a room
        if (user) {
            // Don't need to use broadcast because the user already left
            io.to(user.room).emit('message', generateMessage('System', `${user.username} has left`));
            // update the member list of the current room
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

/* 

let count = 0;

// server (emit) -> client (receive) - updateCount
// server emits an event that the client receives
// client (emit) -> server (receive) - increment
// the client receives an event that the server receives 

// connection event will fire whenever the server receives a 
// new connection. The socket object contains information about
// the connection. You can use methods on socket to communicate
// with those specifically connected clients
io.on('connection', (socket) => {
    // Whenever a new connection comes in then
    // The server sends the current count to that specific 
    // connection. We use socket.emit instead of io.emit because
    // otherwise every client would be notified whenever someone
    // new joined the connection
    socket.emit('updateCount', count);
    
    // When the client sends a request
    socket.on('increment', () => {
        count++;
        // socket.emit('updateCount', count);
        // The above would update the count on a single connection
        io.emit('updateCount', count);
        // the above will update the count on all connections
    });
});

*/

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});