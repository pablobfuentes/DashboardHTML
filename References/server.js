const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// --- Replace this with your actual DeepSeek API key ---
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.post('/api/deepseek', async (req, res) => {
    try {
        const apiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await apiRes.json();
        res.status(apiRes.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

app.get('/', (req, res) => res.send('DeepSeek Proxy is running.'));

app.listen(PORT, () => {
    console.log(`DeepSeek proxy running on port ${PORT}`);
});
