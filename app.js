import mqtt from 'mqtt';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 解決 __dirname 問題
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MQTT 伺服器設定
const MQTT_BROKER_URL = 'mqtt://localhost'; // 替換為你的 MQTT 伺服器地址
const MQTT_TOPIC = 'mp3/play'; // 替換為你訂閱的主題名稱

// 訂閱 MQTT
const client = mqtt.connect(MQTT_BROKER_URL);

client.on('connect', () => {
    console.log(`Connected to MQTT broker at ${MQTT_BROKER_URL}`);
    client.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
            console.error('Failed to subscribe to topic:', err);
        } else {
            console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
        }
    });
});

client.on('message', async (topic, message) => {
    console.log(`Message received on topic ${topic}:`, message.toString());

    try {
        const mp3_url = message.toString();
        if (!mp3_url.startsWith('http')) {
            console.error('Invalid MP3 URL received:', mp3_url);
            return;
        }

        console.log('Valid MP3 URL received:', mp3_url);
        const tempFilePath = path.join(__dirname, 'temp.mp3');
        console.log('Downloading MP3 to:', tempFilePath);

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
            } else {
                console.log('MP3 playback successful');
            }
        });
    } catch (error) {
        console.error('Error processing MQTT message:', error);
    }
});

// 根據操作系統生成播放命令
function getPlayCommand(filePath) {
    const platform = process.platform;
    if (platform === 'win32') {
        return `start "" "${filePath}"`; // Windows
    } else if (platform === 'darwin') {
        return `open "${filePath}"`; // macOS
    } else {
        return `cvlc --play-and-exit "${filePath}"`; // Linux，需要安裝 VLC
    }
}
