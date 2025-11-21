const { loadModel, getSession } = require("../model/emotionModel");
const ort = require("onnxruntime-node");

exports.predictEmotion = async (req, res) => {
  try {
    await loadModel();

    const session = getSession();
    if (!session) {
      return res.status(503).json({ error: "Model not loaded yet" });
    }

    const { features } = req.body;

    if (!features || !Array.isArray(features)) {
      return res.status(400).json({ error: "Missing or invalid features" });
    }

    // Frontend ALWAYS sends exactly 2376 features
    if (features.length !== 2376) {
      console.error("❌ Incorrect feature vector size:", features.length);
      return res.status(400).json({ error: "Incorrect feature length" });
    }

    // Convert to Float32Array
    const inputTensor = new ort.Tensor(
      "float32",
      Float32Array.from(features),
      [1, 2376] // Model expects [batch, features]
    );

    const results = await session.run({ input: inputTensor });

    const scores = results[Object.keys(results)[0]].data;

    // Get index of highest score
    const index = scores.indexOf(Math.max(...scores));

    const labels = [
      "neutral",
      "calm",
      "happy",
      "sad",
      "angry",
      "fear",
      "disgust",
      "surprise"
    ];

    res.json({ emotion: labels[index] || "unknown" });

  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ error: "Prediction failed" });
  }
};
