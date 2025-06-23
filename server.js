const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const open = require('open');
const fs = require('fs');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original filename
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(__dirname, 'uploads', req.file.originalname);
    res.json({
        name: req.file.originalname,
        path: filePath
    });
});

// Handle file opening
app.post('/open-file', (req, res) => {
    const filePath = req.body.path;
    
    if (!filePath) {
        return res.status(400).send('No file path provided.');
    }

    try {
        open(filePath);
        res.json({ success: true });
    } catch (error) {
        console.error('Error opening file:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 