const express = require("express");
const router = express.Router();

const { predictEmotion } = require("../controllers/Predict");

// POST /api/emotion/predict
router.post("/predict", predictEmotion);

module.exports = router;
