function sendError(res, status, message, details) {
  res.status(status).json({
    error: message,
    details: details || null,
  });
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = {
  sendError,
  toNumber,
};
