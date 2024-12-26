const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { port } = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json()); 

connectDB();

app.get('/', (req, res) => {
    res.send('Welcome to API Studio Musik Rental!');
});

// route
app.use('/api', router)

app.use(errorHandler)

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});