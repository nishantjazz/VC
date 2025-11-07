const express = require("express");
const router = express.Router();

router.post("/sign-up", (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

module.exports = router;
