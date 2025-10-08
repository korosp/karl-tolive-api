import express from 'express';
import multer from 'multer';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

// POST /tools/livephoto
app.post('/tools/livephoto', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    if (!req.files.video || !req.files.audio) {
      return res.status(400).json({ error: 'Video dan audio wajib dikirim!' });
    }

    // Convert file buffers ke Base64 agar bisa dikirim ke API
    const videoBase64 = req.files.video[0].buffer.toString('base64');
    const audioBase64 = req.files.audio[0].buffer.toString('base64');
    const fade = parseFloat(req.body.fade) || 0.8;

    // Panggil API Shynne
    const response = await axios.post(
      'https://shynne-apis.vercel.app/tools/livephoto',
      {
        video: videoBase64,
        audio: audioBase64,
        fade
      },
      { responseType: 'arraybuffer' } // biar dapat file MP4
    );

    res.setHeader('Content-Type', 'video/mp4');
    res.send(response.data);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal memproses live photo via API' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
