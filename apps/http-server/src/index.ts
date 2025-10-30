import express from 'express';

const app = express();

app.listen(3001, () => {
    console.log('HTTP server is running on http://localhost:3000');
});