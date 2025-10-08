import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import multer from 'multer';

const execPromise = util.promisify(exec);
const router = express.Router();

// Folder tmp untuk simpan file sementara
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Setup multer untuk upload file
const upload = multer({ dest: tmpDir });

// Endpoint: POST /api/tolive
// Form-data: video (file), audio (file), fade (optional)
router.post('/tolive', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    const videoFile = req.files.video[0].path;
    const audioFile = req.files.audio[0].path;
    const fadeDur = parseFloat(req.body.fade) || 0.8;
    const baseDur = 3;

    const baseClip = path.join(tmpDir, `base-${Date.now()}.mp4`);
    const combinedVideo = path.join(tmpDir, `combined-${Date.now()}.mp4`);
    const outFile = path.join(tmpDir, `out-${Date.now()}.mp4`);

    // Ambil durasi audio
    const { stdout: audDurRaw } = await execPromise(
      `ffprobe -i "${audioFile}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    const audioDuration = parseFloat(audDurRaw.trim());
    if (isNaN(audioDuration) || audioDuration <= 0) throw new Error('Invalid audio duration');

    // Potong video menjadi base clip
    await execPromise(
      `ffmpeg -y -i "${videoFile}" -t ${baseDur} -an -c:v libx264 -pix_fmt yuv420p "${baseClip}"`
    );

    // Hitung berapa banyak clip untuk fade
    const denom = baseDur - fadeDur;
    let n = audioDuration <= baseDur ? 1 : Math.ceil((audioDuration - fadeDur) / denom);
    n = Math.min(Math.max(n, 1), 120);

    if (n === 1) {
      fs.copyFileSync(baseClip, combinedVideo);
    } else {
      const inputs = Array(n).fill(`-i "${baseClip}"`).join(' ');
      const prepParts = [];
      for (let i = 0; i < n; i++) prepParts.push(`[${i}:v]setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);

      const chainParts = [];
      let lastLabel = `[v0]`;
      for (let i = 1; i < n; i++) {
        const offset = i * (baseDur - fadeDur);
        const outLabel = `xf${i}`;
        chainParts.push(`${lastLabel}[v${i}]xfade=transition=fade:duration=${fadeDur}:offset=${offset}[${outLabel}]`);
        lastLabel = `[${outLabel}]`;
      }

      const filterComplex = [...prepParts, ...chainParts].join(';');
      const ffCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "${lastLabel}" -c:v libx264 -pix_fmt yuv420p -an "${combinedVideo}"`;
      await execPromise(ffCmd);
    }

    // Gabungkan audio
    await execPromise(
      `ffmpeg -y -i "${combinedVideo}" -i "${audioFile}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${outFile}"`
    );

    // Kirim file MP4 ke client
    res.download(outFile, 'tolive.mp4', () => {
      // Hapus file sementara
      [videoFile, audioFile, baseClip, combinedVideo, outFile].forEach(f => {
        try { if(f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat video' });
  }
});

export default router;