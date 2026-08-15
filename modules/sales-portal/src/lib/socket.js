import { io } from 'socket.io-client';

// Development mein localhost:3000 use hoga, production mein current domain khud-ba-khud use hoga
const socketURL = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;

const socket = io(socketURL);

export default socket;