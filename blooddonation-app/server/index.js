import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import db from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);

const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const findUserByEmail = db.prepare(
  'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
);

app.use(express.json());

app.post('/api/auth/signup', async (request, response) => {
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!name || name.length > 100) {
    return response.status(400).json({ message: 'Enter a name between 1 and 100 characters.' });
  }

  if (!email || email.length > 254) {
    return response.status(400).json({ message: 'Enter an email address or username up to 254 characters.' });
  }

  if (password.length < 4 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'Password must be 4 to 72 bytes long.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    insertUser.run(name, email, passwordHash);
    return response.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (error) {
    if (error && /UNIQUE constraint failed/i.test(error.message)) {
      return response.status(409).json({ message: 'An account with that email already exists.' });
    }

    console.error('Unable to create user account:', error);
    return response.status(500).json({ message: 'Unable to create your account. Please try again.' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!email || !password) {
    return response.status(400).json({ message: 'Enter your email address or username and password.' });
  }

  try {
    const user = findUserByEmail.get(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ message: 'Email address or password is incorrect.' });
    }

    return response.json({
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Unable to log in user:', error);
    return response.status(500).json({ message: 'Unable to log in. Please try again.' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Authentication API listening on http://127.0.0.1:${port}`);
});
