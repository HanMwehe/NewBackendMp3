import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Path lengkap untuk yt-dlp jika diperlukan
const ytDlpPath = "/usr/bin/yt-dlp"; // Ganti dengan path lengkap jika perlu

// Konversi MP3 (Get Video Info)
app.post("/get-info", async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ message: "videoUrl is required" });
  }

  try {
    // Spawn yt-dlp langsung untuk mendapatkan judul
    const ytdlpProc = spawn(ytDlpPath, ["--get-title", videoUrl]);

    let title = "";

    ytdlpProc.stdout.on("data", (data) => {
      title += data.toString();
    });

    ytdlpProc.stderr.on("data", (data) => {
      console.error(`yt-dlp stderr: ${data}`);
    });

    ytdlpProc.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: "Failed to get video info" });
      }
      return res.json({ title: title.trim() });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to get video info" });
  }
});

// Endpoint untuk Download (Konversi dan Unduh MP3)
app.get("/download", async (req, res) => {
  const { videoUrl } = req.query;

  if (!videoUrl) {
    return res.status(400).json({ message: "Missing video URL" });
  }

  try {
    // Dapatkan judul video
    const ytdlpProc = spawn(ytDlpPath, ["--get-title", videoUrl]);

    let title = "";

    ytdlpProc.stdout.on("data", (data) => {
      title += data.toString();
    });

    ytdlpProc.stderr.on("data", (data) => {
      console.error(`yt-dlp stderr: ${data}`);
    });

    ytdlpProc.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: "Failed to get video info" });
      }

      const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, ""); // Sanitasi judul
      const fileName = `${sanitizedTitle}_${Date.now()}.mp3`;

      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", "audio/mpeg");

      // Spawn yt-dlp untuk download audio dan kemudian pipe ke ffmpeg untuk konversi ke mp3
      const ytdlpAudioProc = spawn(ytDlpPath, [
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

      ytdlpAudioProc.stdout.pipe(ffmpegProc.stdin);
      ffmpegProc.stdout.pipe(res);

      ytdlpAudioProc.stderr.on("data", (data) => console.error(`yt-dlp stderr: ${data}`));
      ffmpegProc.stderr.on("data", (data) => console.error(`ffmpeg stderr: ${data}`));

      ytdlpAudioProc.on("close", (code) => {
        if (code !== 0) {
          console.error(`yt-dlp exited with code ${code}`);
        }
      });

      ffmpegProc.on("close", (code) => {
        if (code !== 0) {
          console.error(`ffmpeg exited with code ${code}`);
        }
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to download video" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
});
