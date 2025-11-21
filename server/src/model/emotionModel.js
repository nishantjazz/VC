const ort = require("onnxruntime-node");
const path = require("path");

let session = null;

async function loadModel() {
  if (session) {
    console.log("🔁 Emotion model already loaded");
    return session;
  }

  try {
    const modelPath = path.join(__dirname, "../../models/emotion_model.onnx");
    console.log("📦 Attempting to load ONNX model from:", modelPath);

    session = await ort.InferenceSession.create(modelPath);

    console.log("✅ Emotion model successfully loaded");
    return session;
  } catch (err) {
    console.error("❌ ONNX model failed to load!");
    console.error(err);
    throw err;
  }
}

module.exports = {
  loadModel,
  getSession: () => session
};
