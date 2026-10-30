// Wrap async handlers so errors do not crash the server
const asyncHandler = (handler) => (req, res) =>
  handler(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  });

module.exports = asyncHandler;
