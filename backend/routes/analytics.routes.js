// backend/routes/analytics.routes.js
const router = require("express").Router();
const analytics = require("../controller/analytics.controller");

// Mounted at /api/analytics in server.js
router.get("/platform", analytics.platform);
router.get("/creator/:wallet", analytics.creator);
router.get("/contributor/:wallet", analytics.contributor);

module.exports = router;
