const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();
app.use("/cadastro_files",express.static("cadastro_files"));
app.use("/login_files",express.static("login_files"));

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

// Handle the index route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle the login route
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post('/submit-form', (req, res) => {
  const somaValue = Number(req.body.soma);

  if (somaValue !== 18) {
    return res.status(400).send('The value of "soma" must be 18.');
  }

  // validation passed, submit form data to database
});

// Handle the post request to register a user
// Handle the post request to register a user
app.post('/', (req, res) => {
  const { nome, email, especialidade, medicos, plano, soma, check, password } = req.body;

  // Hash the password
  bcrypt.hash(password, 10, (err, hash) => {
    //console.log(hash + "  " + password);
    if (err) {
      console.error('Error hashing password: ' + err.stack);
      res.send('An error occurred while processing your request.');
    } else {
      // Store the hashed password in the database
      connection.query(
        'INSERT INTO cliente_bt (nome, email, esp, num_med, plano, soma, receber_novidades, senha) VALUES (?, ?, ?, ?, ?, ?, IFNULL(?, 0), ?)',
        [nome, email, especialidade, medicos, plano, soma, check, hash],
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
    }
  });
});

// Handle the post request to authenticate a user
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  connection.query(
    'SELECT * FROM cliente_bt WHERE email = ?',
    [email],
    (error, results, fields) => {
      if (error) {
        console.error('Error querying database: ' + error.stack);
        res.send('An error occurred while processing your request.');
      } else if (results.length > 0) {
        const user = results[0];
        bcrypt.compare(password, user.senha, (err, result) => {
          if (err) {
            console.error('Error comparing passwords: ' + err.stack);
            res.send('An error occurred while processing your request.');
          } else if (result) {
            console.log('User authenticated');
            res.sendFile(__dirname + '/welcome.html');
          } else {
            console.log('Incorrect password');
            res.send('Username or password is incorrect.');
          }
        });
      } else {
        console.log('User not found');
        res.send('Username or password is incorrect.');
      }
    }
  );
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
