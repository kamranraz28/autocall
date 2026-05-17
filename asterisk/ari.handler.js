const ari = require("ari-client");
const { exec } = require("child_process");
const db = require("../config/db");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const ARI_URL = process.env.ARI_URL || "http://36.50.41.172:8088";
const USER = process.env.ARI_USER || "ariuser";
const PASS = process.env.ARI_PASS || "12345";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let client;

async function getShopDbId(shopId) {
  const [shop] = await db.query(
    "SELECT id FROM shops WHERE shop_id = ? LIMIT 1",
    [shopId],
  );
  if (!shop.length) return null;
  return shop[0].id;
}

async function getRecording(shopDbId, type) {
  const [rec] = await db.query(
    "SELECT * FROM recordings WHERE shop_id = ? AND type = ? LIMIT 1",
    [shopDbId, type],
  );
  return rec[0] || null;
}

function buildPlaybackUrl(fileUrl) {
  const filename = path.basename(fileUrl).replace(".wav", "");

  return `sound:/var/lib/asterisk/sounds/tts/${filename}`;
}
async function init() {
  try {
    client = await ari.connect(ARI_URL, USER, PASS);

    console.log("✅ Connected to ARI");

    client.on("StasisStart", async (event, channel) => {
      const args = event.args[0].split(":");
      const callId = args[0];
      const shopId = args[1];

      console.log("📞 Call started:", callId, "Shop:", shopId);

      let result = "no_input";

      try {
        await channel.answer();

        if (!shopId) {
          console.log("❌ No shop_id provided");
          channel.hangup();
          return;
        }

        const shopDbId = await getShopDbId(shopId);
        if (!shopDbId) {
          console.log("❌ Shop not found:", shopId);
          channel.hangup();
          return;
        }

        let handled = false;
        let dtmfTimeout;
        let callTimeout;

        const playAudio = async (media) => {
          return new Promise((resolve, reject) => {
            const playback = client.Playback();
            console.log("▶️ MEDIA:", media);

            playback.on("PlaybackFinished", resolve);
            playback.on("PlaybackFailed", (err) => {
              console.log("❌ Playback failed:", err);
              reject(err);
            });

            channel.play(
              {
                media,
              },
              playback,
            );
          });
        };

        const welcomeRecording = await getRecording(shopDbId, "welcome");
        if (welcomeRecording) {
          const welcomeUrl = buildPlaybackUrl(welcomeRecording.file_url);
          console.log("🎵 Playing welcome:", welcomeUrl);
          const filename = welcomeRecording.file_url.split("/").pop();

          await playAudio(welcomeUrl, filename);
        } else {
          console.log("⚠️ No welcome recording — skipping playback");
        }

        callTimeout = setTimeout(() => {
          console.log("⏰ Call timeout — hanging up");
          channel.hangup();
        }, 15000);

        const resetHandler = () => {
          handled = false;
          if (dtmfTimeout) clearTimeout(dtmfTimeout);
          dtmfTimeout = setTimeout(() => {
            handled = false;
          }, 5000);
        };

        channel.on("ChannelDtmfReceived", async (e, chan) => {
          if (handled) return;

          console.log("🔢 Pressed:", e.digit);
          handled = true;

          if (e.digit === "1") {
            result = "success";
            await db.query("UPDATE calls SET result=? WHERE call_id=?", [
              result,
              callId,
            ]);

            const successRecording = await getRecording(shopDbId, "success");
            if (successRecording) {
              const filename = successRecording.file_url.split("/").pop();

              await playAudio(
                buildPlaybackUrl(successRecording.file_url),
                filename,
              );
            }
            chan.hangup();
          } else if (e.digit === "2") {
            result = "thank_you";
            await db.query("UPDATE calls SET result=? WHERE call_id=?", [
              result,
              callId,
            ]);

            const thankYouRecording = await getRecording(shopDbId, "thank_you");
            if (thankYouRecording) {
              const filename = thankYouRecording.file_url.split("/").pop();

              await playAudio(
                buildPlaybackUrl(thankYouRecording.file_url),
                filename,
              );
            }
            chan.hangup();
          } else {
            resetHandler();
          }
        });

        channel.on("StasisEnd", async () => {
          console.log("📴 Call ended:", callId);

          await db.query(
            "UPDATE calls SET status='completed', ended_at=NOW() WHERE call_id=?",
            [callId],
          );

          if (dtmfTimeout) clearTimeout(dtmfTimeout);
          if (callTimeout) clearTimeout(callTimeout);
        });
      } catch (err) {
        console.error("❌ Call handling error:", err);
      }
    });

    client.start("ivr-app");
    console.log("🚀 ARI app started");
  } catch (err) {
    console.error("❌ ARI connection failed:", err.message);
  }
}

init();

module.exports = {
  getClient: () => client,
};
