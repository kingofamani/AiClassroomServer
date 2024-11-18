import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 解決 ES 模組中的 __dirname 問題
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(bodyParser.json());

app.post('/play', async (req, res) => {
    console.log('Request received:', req.body);

    const { mp3_url } = req.body;
    if (!mp3_url) {
        console.error('No MP3 URL provided');
        return res.status(400).send('No MP3 URL provided');
    }

    const tempFilePath = path.join(__dirname, 'temp.mp3');
    console.log('Downloading MP3 to:', tempFilePath);

    try {
        // 下載 MP3 檔案
        const response = await fetch(mp3_url);
        if (!response.ok) {
            throw new Error(`Failed to download MP3: ${response.statusText}`);
        }

        const fileStream = fs.createWriteStream(tempFilePath);
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });
        console.log('MP3 downloaded successfully');

        // 播放 MP3 檔案
        const playCommand = getPlayCommand(tempFilePath);
        exec(playCommand, (err) => {
            if (err) {
                console.error('Error during MP3 playback:', err);
                return res.status(500).send('Error playing MP3');
            }
            console.log('MP3 playback successful');
        });

        return res.status(200).send('Playing MP3');
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).send('Error processing request');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// 根據操作系統生成播放命令
function getPlayCommand(filePath) {
    const platform = process.platform;
    if (platform === 'win32') {
        return `start "" "${filePath}"`; // Windows，雙引號包裹路徑
    } else if (platform === 'darwin') {
        return `open "${filePath}"`; // macOS
    } else {
        return `cvlc --play-and-exit "${filePath}"`; // Linux
    }
}
