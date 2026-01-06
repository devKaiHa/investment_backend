const mongoose = require("mongoose");

const dbConnection = async () => {
  var dbUrl = process.env.DB_URI;

  mongoose
    .connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((conn) => {
      console.log(`databases Connceted:${conn.connection.host}`);
    });
};

module.exports = dbConnection;
