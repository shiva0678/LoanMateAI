require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '16kb' }));
app.use('/api', chatRouter);

app.get('/health', (req, res) => res.json({ success: true, service: 'loanmate-backend' }));

if (require.main === module) {
  app.listen(port, () => console.log(`LoanMate backend listening on port ${port}`));
}

module.exports = app;
