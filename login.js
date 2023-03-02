const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'clebsonsouza055@gmail.com',
    pass: 'tijizudpnakhpzwv'
  }
});
console.log('hey');

const app = express();
app.use("/cadastro_files",express.static("cadastro_files"));
app.use("/login_files",express.static("login_files"));
app.set('view engine', 'ejs');

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
  res.render('login', { showErrorMessage: false });
});

app.get('/password-reset', (req, res) => {
  res.render('password-reset', { 
    showSuccessMessage: false,
    showErrorMessage: false
  });
});

app.get('/changePass', (req, res) => {
  const email = req.query.email;
  const token = req.query.token;
  //console.log(email + token);
  // Query the database to find the user with the matching email and token
  connection.query('SELECT * FROM cliente_bt WHERE email = ? AND reset_token = ? AND reset_token_expiration > NOW()', [email, token], (error, results, fields) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      res.render('changePass', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while processing your request.' });
    } else if (results.length > 0) {
      // The email and token are valid, so render the reset password view
      res.render('changePass', { showSuccessMessage: false, showErrorMessage: false, email: email, token: token });
    } else {
      // The email and/or token are not valid
      res.render('changePass', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'Invalid password reset link. Please check your email for the correct link.' });
    }
  });
});

app.get('/passChanged', (req, res) => {
  res.render('passChanged');
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
            //console.log('Incorrect password');
            //res.send('Username or password is incorrect.');
            res.render('login', { error: 'Tente novamente', showErrorMessage: true });
          }
        });
      } else {
        //console.log('User not found' + email + password);
        res.render('login', { error: 'Tente novamente', showErrorMessage: true });
      }
    }
  );
});

app.post('/password-reset', (req, res) => {
  const email = req.body.email;

  connection.query('SELECT * FROM cliente_bt WHERE email = ?',[email],(error, results, fields) => {
      if (error) {
        console.error('Error querying database: ' + error.stack);
        res.render('password-reset', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while processing your request.' });
      } 
      else if (results.length > 0) {
        // Generate a password reset token and store it in the database

        const token = Math.random().toString(36).slice(2);
        connection.query(
          'UPDATE cliente_bt SET reset_token = ?, reset_token_expiration = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = ?',
          [token, email],
          (error, results, fields) => {
            if (error) {
              console.error('Error updating database: ' + error.stack);
              res.render('password-reset', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while processing your request.' });
            } else {
              // Send a password reset email to the user
              const resetUrl = `http://localhost:3000/changePass?email=${email}&token=${token}`;
              const mailOptions = {
                from: 'clebsonsouza055@gmail.com',
                to: email,
                subject: 'Password Reset Request',
                text: `Please click the following link to reset your password: ${resetUrl}`
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error('Error sending email: ' + error.stack);
                  res.render('password-reset', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while sending the email.' });
                } else {
                  console.log('Email sent: ' + info.response);
                  res.render('password-reset', { showSuccessMessage: true, successMessage: 'Email sent', showErrorMessage: false });
                }
              });
            }
          }
        );
      } else {
        // No user found with the given email address
        res.render('password-reset', { 
          showSuccessMessage: false,
          showErrorMessage: true, 
          errorMessage: 'No user found with the given email address.' 
        });
      }
    }
  );
});

app.post('/changePass', (req, res) => {
  const email = req.body.email;
  const token = req.body.token;
  const password = req.body.password;
  console.log(email + " " + token);

  // Query the database to find the user with the matching email and token
  connection.query('SELECT * FROM cliente_bt WHERE email = ? AND reset_token = ? AND reset_token_expiration > NOW()', [email, token], (error, results, fields) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      res.render('changePass', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while processing your request.' });
    } else if (results.length > 0) {
      // The email and token are valid, so update the user's password in the database
      bcrypt.hash(password, 10, (err, hash) => {
        //console.log(hash + "  " + password);
        if (err) {
          console.error('Error hashing password: ' + err.stack);
          res.send('An error occurred while processing your request.');
        } else {
          // Store the hashed password in the database
          connection.query('UPDATE cliente_bt SET senha = ?, reset_token = NULL, reset_token_expiration = NULL WHERE email = ?', [hash, email], (error, results, fields) => {
            if (error) {
              console.error('Error updating database: ' + error.stack);
              res.render('changePass', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'An error occurred while updating your password.' });
            } else {
              // Password was successfully updated in the database
              res.render('passChanged', { showSuccessMessage: false, showErrorMessage: true, errorMessage:  'DONE'});
            }
          });
        }
      });
    } else {
      // The email and/or token are not valid
      res.render('changePass', { showSuccessMessage: false, showErrorMessage: true, errorMessage: 'Invalid password reset link. Please check your email for the correct link.' });
    }
  });
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
