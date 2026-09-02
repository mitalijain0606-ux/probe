const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const config = require('../config');
const logger = require('../utils/logger');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && re.test(email.trim());
}

async function signup({ email, password }) {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('Please provide a valid email address');
    error.status = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.status = 400;
    throw error;
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.status = 409;
    throw error;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  logger.info({
    event: 'signup',
    userId: user.id,
    email: user.email,
  });

  const token = generateToken(user);

  return {
    user,
    token,
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    logger.warn({
      event: 'login_failed',
      reason: 'user_not_found',
      email: normalizedEmail,
    });
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn({
      event: 'login_failed',
      reason: 'invalid_password',
      email: normalizedEmail,
      userId: user.id,
    });
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  logger.info({
    event: 'login',
    userId: user.id,
    email: user.email,
  });

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    token,
  };
}

module.exports = {
  signup,
  login,
  isValidEmail,
};
