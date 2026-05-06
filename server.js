const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.30.101:3001"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage (for demo - use database in production)
let users = [];
let events = [];
let connectedUsers = new Map(); // socketId -> userId

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, otp } = req.body;

  // Check if user exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email đã được đăng ký' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = {
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    avatar: null,
    bio: '',
    createdAt: new Date()
  };

  users.push(user);

  // Generate token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

app.post('/api/auth/send-otp', (req, res) => {
  const { email, type } = req.body;

  // Generate demo OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`OTP for ${email} (${type}): ${otp}`);

  res.json({
    otp,
    demo: true,
    message: `OTP đã gửi tới ${email} (demo)`
  });
});

// Events Routes
app.get('/api/events', verifyToken, (req, res) => {
  res.json(events);
});

app.post('/api/events', verifyToken, (req, res) => {
  const { title, description, date, category, location } = req.body;

  const event = {
    id: uuidv4(),
    title,
    description,
    date,
    category,
    location,
    createdBy: req.user.id,
    attendees: [req.user.id],
    createdAt: new Date()
  };

  events.push(event);

  // Broadcast new event to all connected users
  io.emit('event_created', event);

  res.json(event);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins
  socket.on('join', (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined with socket ${socket.id}`);

    // Send current online count
    io.emit('online_count', connectedUsers.size);
  });

  // User joins event room
  socket.on('join_event', (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`Socket ${socket.id} joined event ${eventId}`);
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    const { eventId, message, userId, userName } = data;

    const chatMessage = {
      id: uuidv4(),
      eventId,
      userId,
      userName,
      message,
      timestamp: new Date()
    };

    // Broadcast to event room
    io.to(`event_${eventId}`).emit('new_message', chatMessage);
  });

  // Handle event updates
  socket.on('update_event', (data) => {
    const { eventId, updates } = data;

    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      events[eventIndex] = { ...events[eventIndex], ...updates };

      // Broadcast update to all users
      io.emit('event_updated', events[eventIndex]);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    console.log(`User ${userId} disconnected: ${socket.id}`);

    // Update online count
    io.emit('online_count', connectedUsers.size);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend can connect to: http://localhost:${PORT}`);
});