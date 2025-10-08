import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// POST /tools/livephoto
router.post('/livephoto', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    if (!req.files.video || !req.files.audio) {
      return res.status(400).json({ error: 'Video dan audio wajib dikirim!' });
    }

    const videoBuffer = req.files.video[0].buffer;
    const audioBuffer = req.files.audio[0].buffer;
    const fade = parseFloat(req.body.fade) || 0.8;

    const tmpDir = path.join(process.cwd(), 'tmp');
    const videoPath = path.join(tmpDir, `video-${Date.now()}.mp4`);
    const audioPath = path.join(tmpDir, `audio-${Date.now()}.mp3`);
    const outPath = path.join(tmpDir, `out-${Date.now()}.mp4`);

    fs.writeFileSync(videoPath, videoBuffer);
    fs.writeFileSync(audioPath, audioBuffer);

    // Proses ffmpeg
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        `-shortest`,
        `-c:v libx264`,
        `-pix_fmt yuv420p`,
        `-c:a aac`,
        `-b:a 192k`
      ])
      .save(outPath)
      .on('end', () => {
        const resultBuffer = fs.readFileSync(outPath);
        res.setHeader('Content-Type', 'video/mp4');
        res.send(resultBuffer);

        // Hapus file sementara
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);
        fs.unlinkSync(outPath);
      })
      .on('error', (err) => {
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat live photo' });
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;      for (let i = 0; i < n; i++) prepParts.push(`[${i}:v]setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);

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
