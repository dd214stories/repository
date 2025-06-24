require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');
const dayjs = require('dayjs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Google Drive folder ID
const folderId = '1FIu0Gyoy7Prb09QaV2iaSqhWx0kxSAqa';

// Decode and parse Google service account JSON from base64 env var
const base64Key = process.env.GOOGLE_SERVICE_KEY_BASE64;
if (!base64Key) {
  console.error('❌ GOOGLE_SERVICE_KEY_BASE64 environment variable is missing');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString('utf8'));

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

app.post('/incoming', async (req, res) => {
  const from = req.body.From || 'unknown';
  const mediaUrl = req.body.MediaUrl0;
  const contentType = req.body.MediaContentType0;

  if (!mediaUrl || !contentType.startsWith('video')) {
    return res.send('<Response><Message>No video found in message.</Message></Response>');
  }

  try {
    // Download video file
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // Format filename
    const timestamp = dayjs().format('YYYYMMDDHHmm');
    const sanitizedPhone = from.replace(/[^+\d]/g, '');
    const fileName = `${sanitizedPhone}_${timestamp}.mp4`;

    // Upload to Google Drive
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: contentType,
      body: Buffer.from(buffer),
    };

    await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });

    console.log(`✅ Video saved as ${fileName}`);
    res.send('<Response><Message>Thank you! Your video has been received.</Message></Response>');
  } catch (error) {
    console.error('❌ Error uploading video:', error.message);
    res.send('<Response><Message>There was a problem saving your video. Please try again later.</Message></Response>');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
