const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use("/assets",express.static("assets"));

// Create a MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: 'clebson223', // Replace with your MySQL password
  database: 'biotech'
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }

  console.log('Connected to database as id ' + connection.threadId);
});

// Set up the HTTP server
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

app.post('/', (req, res) => {
  const { username, password } = req.body;

  // Check if the username and password match an existing record in the database
  connection.query(
    'SELECT * FROM loginuser WHERE user_name = ? AND user_pass = ?',
    [username, password],
    (error, results, fields) => {
      if (error) {
        console.error('Error querying database: ' + error.stack);
        res.send('An error occurred while processing your request.');
      } else if (results.length > 0) {
        //console.log('User authenticated');
        //res.send('User authenticated.');
        res.sendFile(__dirname + '/welcome.html');
      } else {
        connection.query(
          'INSERT INTO loginuser (user_name, user_pass) VALUES (?, ?)',
          [username, password],
          (error, results, fields) => {
            if (error) {
              console.error('Error inserting data: ' + error.stack);
              res.send('An error occurred while processing your request.');
            } else {
              console.log('Inserted ' + results.affectedRows + ' rows');
              res.send("Registered");
            }
          }
        );
        
        console.log('User not found, but not registered');
        //res.send('Username or password is incorrect.');
      }
    }
  );

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
