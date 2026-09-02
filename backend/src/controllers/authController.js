const authService = require('../services/authService');

async function signup(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.signup({ email, password });
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
};
