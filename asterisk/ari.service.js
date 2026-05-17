const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);
const Client = require("ssh2-sftp-client");

// const ARI_URL = "http://192.168.0.132:8088";
const ARI_URL = "http://36.50.41.172:8088";
const ARI_USER = process.env.ARI_USER || "ariuser";
const ARI_PASS = process.env.ARI_PASS || "12345";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VOICE_ID;
const VPS_HOST = "36.50.41.172";
const VPS_USER = "root";
const VPS_PASS = process.env.VPS_PASS;

async function generateTTS(textMessage, filename) {
  try {
    const uploadDir = path.join(process.cwd(), "uploads/tts");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const originalPath = path.join(uploadDir, `${filename}-original.wav`);
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,

      {
        text: textMessage,

        // IMPORTANT
        model_id: "eleven_v3",
      },

      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          Accept: "audio/wav",
          "Content-Type": "application/json",
        },

        responseType: "arraybuffer",
      },
    );

    fs.writeFileSync(originalPath, response.data);

    const convertedPath = path.join(uploadDir, `${filename}.wav`);

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .audioCodec("pcm_s16le")
        .audioFrequency(8000)
        .audioChannels(1)
        .format("wav")
        .save(convertedPath)
        .on("end", () => {
          console.log("✅ WAV converted");
          resolve();
        })
        .on("error", reject);
    });

    console.log("TTS SAVED:", originalPath);

    // Upload to VPS

    const sftp = new Client();

    await sftp.connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
    });

    await sftp.put(
      convertedPath,
      `/var/lib/asterisk/sounds/tts/${filename}.wav`,
    );
    await sftp.chmod(`/var/lib/asterisk/sounds/tts/${filename}.wav`, 0o644);

    await sftp.end();

    console.log("✅ Uploaded to VPS");

    return {
      success: true,
      filePath: `tts/${filename}.wav`,
    };
  } catch (error) {
    console.error(
      "ELEVENLABS ERROR:",
      error.response?.data
        ? Buffer.from(error.response.data).toString()
        : error.message,
    );
    console.error("FULL ERROR:", error);

    return {
      success: false,
      error: error.response?.data
        ? Buffer.from(error.response.data).toString()
        : error.message,
    };
  }
}

function formatDialNumber(num) {
  let n = num.replace(/^\+/, "");
  if (n.startsWith("880")) {
    n = "0" + n.slice(3);
  } else if (!n.startsWith("0")) {
    n = "0" + n;
  }
  return n;
}

async function makeCall({ to, callId, shopId }) {
  try {
    const response = await axios.post(
      `${ARI_URL}/ari/channels`,
      {
        endpoint: `PJSIP/${formatDialNumber(to)}@mytrunk-endpoint`,
        app: "ivr-app",
        appArgs: `${callId}:${shopId}`,
      },
      {
        auth: {
          username: ARI_USER,
          password: ARI_PASS,
        },
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "ARI ORIGINATE ERROR:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

module.exports = {
  generateTTS,
  makeCall,
};
