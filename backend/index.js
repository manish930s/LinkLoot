const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Analyze endpoint
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--dump-json', url]);
    const info = JSON.parse(stdout);
    res.json({ videoInfo: info });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: 'Failed to analyze video.' });
  }
});

// Download endpoint
app.post('/api/download', async (req, res) => {
  const { url, format, title } = req.body;
  if (!url || !format || !title) return res.status(400).json({ error: 'Missing parameters' });
  try {
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const isAudioOnly = format.toLowerCase().includes('audio') || format.toLowerCase().includes('mp3');
    const extension = isAudioOnly ? 'mp3' : 'mp4';
    const filename = `${sanitizedTitle}.${extension}`;
    const outputPath = path.join('/tmp', filename); // Cloud Run allows writing to /tmp
    let args = [
      url,
      '-f', format,
      '-o', outputPath,
      ...(isAudioOnly ? ['--extract-audio', '--audio-format', 'mp3'] : [])
    ];
    await execFileAsync('yt-dlp', args);
    res.download(outputPath, filename, err => {
      if (err) {
        res.status(500).json({ error: 'Failed to send file.' });
      }
      // Optionally, delete the file after sending
      fs.unlink(outputPath, () => {});
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process download.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
