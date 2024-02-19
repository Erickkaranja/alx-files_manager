const express = require('express');
const router = require('./routes/index');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 5000;
app.use('/', router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
