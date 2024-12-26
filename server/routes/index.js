const express = require('express');
const authRoute = require('./authRoute');

const router = express.Router();

router.use(authRoute);

module.exports = router;
