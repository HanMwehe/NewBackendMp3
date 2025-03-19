import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import dotenv from "dotenv";
import ytdlp from "yt-dlp-exec"; // Import yt-dlp-exec
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Konversi MP3
app.post("/get-info", async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ message: "videoUrl is required" });
  }
  try {
    const title = await ytdlp(videoUrl, { getTitle: true });
    return res.json({ title });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to get video info" });
  }
});

// Download endpoint
app.get("/download", async (req, res) => {
  const { videoUrl } = req.query;

  if (!videoUrl) {
    return res.status(400).json({ message: "Missing video URL" });
  }

  try {
    const title = await ytdlp(videoUrl, { getTitle: true });
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, "");
    const fileName = `${sanitizedTitle}_${Date.now()}.mp3`;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "audio/mpeg");

    // yt-dlp download audio (webm/m4a) -> pipe ke ffmpeg untuk konversi ke mp3
    const ytdlpProc = spawn("yt-dlp", [
      "-f",
      "bestaudio",
      "-o",
      "-",
      videoUrl,
    ]);

    const ffmpegProc = spawn("ffmpeg", [
      "-i",
      "pipe:0",
      "-f",
      "mp3",
      "-ab",
      "192000",
      "-vn",
      "pipe:1",
    ]);

    ytdlpProc.stdout.pipe(ffmpegProc.stdin);
    ffmpegProc.stdout.pipe(res);

    ytdlpProc.stderr.on("data", (data) => console.error(`yt-dlp stderr: ${data}`));
    ffmpegProc.stderr.on("data", (data) => console.error(`ffmpeg stderr: ${data}`));

    ytdlpProc.on("close", (code) => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
      }
    });

    ffmpegProc.on("close", (code) => {
      if (code !== 0) {
        console.error(`ffmpeg exited with code ${code}`);
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to download video" });
  }
});

app.use("/download", express.static("output"));

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
