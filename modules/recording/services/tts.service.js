const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function generateTTS(textMessage, filename) {
  try {
    const uploadDir = path.join(process.cwd(), "uploads/tts");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const mp3Path = path.join(uploadDir, `${filename}.mp3`);
    const wavPath = path.join(uploadDir, `${filename}.wav`);

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      data: {
        text: textMessage,
        model_id: "eleven_v3",
      },
      responseType: "arraybuffer",
    });

    fs.writeFileSync(mp3Path, response.data);

    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -i "${mp3Path}" -ar 8000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
        (error) => {
          if (error) return reject(error);
          resolve();
        }
      );
    });

    console.log("✅ WAV SAVED:", wavPath);

    return {
      success: true,
      filePath: `uploads/tts/${filename}.wav`,
      fullUrl: `${BASE_URL}/uploads/tts/${filename}.wav`,
    };
  } catch (error) {
    console.error(
      "❌ TTS ERROR:",
      error.response?.data
        ? Buffer.from(error.response.data).toString()
        : error.message
    );

    return {
      success: false,
      error: error.response?.data
        ? Buffer.from(error.response.data).toString()
        : error.message,
    };
  }
}

module.exports = {
  generateTTS,
};