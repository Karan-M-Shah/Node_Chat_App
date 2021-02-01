const socket = io();

// Elements
const form = document.querySelector('#message-form');
// use query selector to find something inside of the form
const input = form.querySelector('input');
const button = form.querySelector('button');
const locationButton = document.querySelector('#send-location');
const messages = document.querySelector('#messages');

// Templates
// Need the html within the template so we use innerHTML
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
// Returns the querystring from the url as an object
// We destructure the object
const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true }); // ignore removes the ? from string

// auto-scroll login
const autoscroll = () => {
    // New message element
    // lastElementChild will grab the most recent message
    const newMessage = messages.lastElementChild;

    // Get the height of the new message 
    const newMessageStyles = getComputedStyle(newMessage); // getComputedStyle is provided by browser
    const newMessageMargin = parseInt(newMessageStyles.marginBottom); // Get the margin bottom and convert to int
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin; // doesn't account for margin

    // visible page height
    const visibleHeight = messages.offsetHeight;

    // Height of messages container
    const containerHeight = messages.scrollHeight; // total height we are able to scroll through

    // Now figure out how far we have scrolled
    const scrollOffset = messages.scrollTop + visibleHeight; // the amount of distance we have scrolled from the top

    // conditional logic to decide whether to scroll
    // checks whether we were at the bottom BEFORE the new message was added
    // if so, we will autoscroll. If not, no autoscroll
    if(containerHeight - newMessageHeight <= scrollOffset) {
        messages.scrollTop = messages.scrollHeight; // pushes us down to the bottom
    }

}

// Event listener for the message event from the server
socket.on('message', (message) => {
    // This variable will store the final html we'll render to the browser
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') //moment js
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

// Event listenger for the locationMessage event from the server
// This is for whenever the user shares their location
socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        message: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

// Event listener for the current member list in a room
// destructure the object that is passed in from the server
socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

// HTML element event listeners
// These events will trigger the server responses > index.js
// The server handles any back-end async functionality such as 
// checking for profanity or using an API

form.addEventListener('submit', (e) => {
    // prevents browser from refreshing the page
    e.preventDefault();

    // Disables the form once it's been submitted
    button.setAttribute('disabled', 'disabled');

    // get the value from the input field
    const messageVar = e.target.elements.text.value;

    // First argument is the name of the event
    // everything after is provided to the callback function
    socket.emit('sendMessage', messageVar, (error) => {
        // reenable the button
        button.removeAttribute('disabled');
        // clear the input and focus on it
        input.value = '';
        input.focus();

        if(error) {
            return console.log(error);
        }
        console.log('Message delivered!');
    });
});

locationButton.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser');
    }

    // Disable the button
    locationButton.setAttribute('disabled', 'disabled');

    // If the user accepts to sharing their location
    // Send a request to the server including the client's lat and lon
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            // Enable the button
            locationButton.removeAttribute('disabled');
            console.log('Location shared!')
        });
    });
});

// Will accept the username and room to the server
// Server will listen for this event
// callback acknowledgement function. Will get called with an error if there is one
// or wont be called with an error
socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error);
        // redirect to the root of the site (join page)
        location.href = '/';
    }
});

// socket.on('updateCount', (count) => {
//     console.log(count);
// });

// document.querySelector("#increment").addEventListener('click', () => {
//     console.log('CLicked');
//     socket.emit('increment');
// });