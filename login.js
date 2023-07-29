const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');

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

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

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
app.use(express.json());

// Handle the index route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.sendFile(__dirname + '/welcome.html'); // Send the welcome page if authenticated
  }else {
    res.sendFile(__dirname + '/index.html');
  }
});

// Handle the login route
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.sendFile(__dirname + '/welcome.html'); // Send the welcome page if authenticated
  } else{
    res.render('login', { showErrorMessage: false });
  }
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

app.get('/custos', (req, res) => {
  if (req.isAuthenticated()) {
    const email = req.user.email; // Get the email of the authenticated user

    const sql = 'SELECT * FROM custos WHERE cliente_bt_id = ?'; // Add the WHERE clause to filter results
    connection.query(sql, [email], (err, results) => {
      if (err) {
        console.error('Error executing the query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Format the dates as DD/MM/YYYY
      const formattedResults = results.map((row) => {
        const formattedDataRegistro = formatDate(row.data_registro);
        const formattedDataSaida = formatDate(row.data_saida);
        return { ...row, data_registro: formattedDataRegistro, data_saida: formattedDataSaida };
      });

      // Render the custos.html template with the formatted results
      res.render('custos', { custos: formattedResults });
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/faturamento', (req, res) => {
  if (req.isAuthenticated()) {
    const email = req.user.email; // Get the email of the authenticated user

    const sql = 'SELECT * FROM faturamento WHERE cliente_bt_id = ?'; // Add the WHERE clause to filter results
    connection.query(sql, [email], (err, results) => {
      if (err) {
        console.error('Error executing the query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Format the dates as DD/MM/YYYY
      const formattedResults = results.map((row) => {
        const formattedData = formatDate(row.data);
        return { ...row, data: formattedData };
      });

      // Render the custos.html template with the formatted results
      res.render('faturamento', { faturamento: formattedResults });
    });
  } else {
    res.redirect('/login');
  }
});

// Helper function to format the date as DD/MM/YYYY
function formatDate(date) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const formattedDate = new Date(date).toLocaleDateString('pt-BR', options);
  return formattedDate;
}


passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser((email, done) => {
  connection.query(
    'SELECT * FROM cliente_bt WHERE email = ?',
    [email],
    (error, results, fields) => {
      if (error) {
        console.error('Error querying database:', error);
        return done(error);
      }

      if (results.length > 0) {
        const user = results[0];
        return done(null, user);
      } else {
        return done(new Error('User not found'));
      }
    }
  );
});


app.post('/login', passport.authenticate('local', {
  successRedirect: '/welcome',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/welcome', (req, res) => {
  if (req.isAuthenticated()) {
    return res.sendFile(__dirname + '/welcome.html'); // Send the welcome page if authenticated
  }
  // Handle the case when user is not authenticated
  res.redirect('/login');
});



passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  connection.query(
    'SELECT * FROM cliente_bt WHERE email = ?',
    [email],
    (error, results, fields) => {
      if (error) {
        console.error('Error querying database:', error);
        return done(error);
      }

      if (results.length > 0) {
        const user = results[0];
        bcrypt.compare(password, user.senha, (err, result) => {
          if (err) {
            console.error('Error comparing passwords:', err);
            return done(err);
          } else if (result) {
            console.log('User authenticated' + user.email);
            
            return done(null, user);
          } else {
            console.log("auto");
            return done(null, false, { message: 'Incorrect password' });
          }
        });
      } else {
        return done(null, false, { message: 'User not found' });
      }
    }
  );
}));


app.post('/submit-form', (req, res) => {
  const somaValue = Number(req.body.soma);

  if (somaValue !== 18) {
    return res.status(400).send('The value of "soma" must be 18.');
  }

  // validation passed, submit form data to database
});

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

// Handle the saveEntry route
app.post('/save-entry', (req, res) => {
  const { dataRegistro, dataSaida, descricao, quantidade, valorUnit } = req.body;
  const userEmail = req.user.email; // Assuming the email is stored in req.user.email

  // Calculate the total value
  const valorTotal = quantidade * valorUnit;

  // Insert the entry into the MySQL database
  const insertQuery = `INSERT INTO custos (data_registro, data_saida, descricao, quantidade, valor_unit, valor_total, cliente_bt_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const insertValues = [dataRegistro, dataSaida, descricao, quantidade, valorUnit, valorTotal, userEmail];

  connection.query(insertQuery, insertValues, (error, insertResult) => {
    if (error) {
      console.error('Error saving entry:', error);
      res.status(500).json({ error: 'An error occurred while saving the entry' });
    } else {
      console.log('Entry saved successfully');
      
      // Retrieve the newly added entry from the database
      const fetchQuery = 'SELECT * FROM custos WHERE id = ?'; // Assuming 'id' is the primary key column in your table
      const fetchValues = [insertResult.insertId]; // 'insertResult.insertId' contains the auto-generated ID of the inserted row

      connection.query(fetchQuery, fetchValues, (fetchError, fetchResult) => {
        if (fetchError) {
          console.error('Error fetching data:', fetchError);
          res.status(500).json({ error: 'An error occurred while fetching the data' });
        } else {
          // Format the dates as DD/MM/YYYY
          const formattedDataRegistro = formatDate(fetchResult[0].data_registro);
          const formattedDataSaida = formatDate(fetchResult[0].data_saida);
          
          // Create a newCusto object with the formatted date values
          const newCusto = {
            ...fetchResult[0],
            data_registro: formattedDataRegistro,
            data_saida: formattedDataSaida
          };
          
          // Send the newly added entry as the response
          res.status(200).json({ custo: newCusto });
        }
      });
    }
  });
});

app.post('/save-entry-fat', (req, res) => {
  if (req.isAuthenticated()) {
    const email = req.user.email;
    const {
      data,
      paciente,
      cpf,
      plano,
      procedimento,
      situacao,
      valor,
      pagamento,
      parcelamento,
      bandeira,
      taxa,
      desconto,
      valorLiq,
    } = req.body;

    // Additional validation if required
    if (!data || !paciente || !cpf || !plano || !procedimento || !situacao || !valor || !pagamento || !parcelamento || !bandeira || !taxa || !desconto || !valorLiq) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const sql = 'INSERT INTO faturamento (data, paciente, cpf, plano, procedimento, situacao, valor, pagamento, parcelamento, bandeira, taxa, desconto, valor_liq, cliente_bt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(
      sql,
      [data, paciente, cpf, plano, procedimento, situacao, valor, pagamento, parcelamento, bandeira, taxa, desconto, valorLiq, email],
      (err, result) => {
        if (err) {
          console.error('Error executing the query:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        const newEntry = {
          data: data,
          paciente: paciente,
          cpf: cpf,
          plano: plano,
          procedimento: procedimento,
          situacao: situacao,
          valor: valor,
          pagamento: pagamento,
          parcelamento: parcelamento,
          bandeira: bandeira,
          taxa: taxa,
          desconto: desconto,
          valor_liq: valorLiq,
          cliente_bt_id: email,
          id: result.insertId, // The newly inserted row's ID
        };

        res.status(200).json({ custo: newEntry });
      }
    );
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});



app.post('/delete-entries', (req, res) => {
  const { ids } = req.body;

  // Delete the rows with the specified IDs from the MySQL database
  const deleteQuery = 'DELETE FROM custos WHERE id IN (?)';
  const deleteValues = [ids];

  connection.query(deleteQuery, deleteValues, (error, deleteResult) => {
    if (error) {
      console.error('Error deleting entries:', error);
      res.status(500).json({ error: 'An error occurred while deleting the entries' });
    } else {
      console.log('Entries deleted successfully');
      res.status(200).json({ message: 'Entries deleted successfully' });
    }
  });
});


app.post('/save-entry-fat', (req, res) => {
  const { data, paciente, cpf, plano, procedimento, situacao, valor, pagamento, parcelamento, bandeira, taxa, desconto, valor_liq } = req.body;
  const userEmail = req.user.email; // Assuming the email is stored in req.user.email

  // Insert the entry into the MySQL database
  const insertQuery = `INSERT INTO faturamento (data, paciente, cpf, plano, procedimento, situacao, valor, pagamento, parcelamento, bandeira, taxa, desconto, valor_liq, cliente_bt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const insertValues = [data, paciente, cpf, plano, procedimento, situacao, valor, pagamento, parcelamento, bandeira, taxa, desconto, valor_liq, userEmail];

  connection.query(insertQuery, insertValues, (error, insertResult) => {
    if (error) {
      console.error('Error saving entry:', error);
      res.status(500).json({ error: 'An error occurred while saving the entry' });
    } else {
      console.log('Entry saved successfully');
      
      // Retrieve the newly added entry from the database
      const fetchQuery = 'SELECT * FROM faturamento WHERE id = ?'; // Assuming 'id' is the primary key column in your table
      const fetchValues = [insertResult.insertId]; // 'insertResult.insertId' contains the auto-generated ID of the inserted row

      connection.query(fetchQuery, fetchValues, (fetchError, fetchResult) => {
        if (fetchError) {
          console.error('Error fetching data:', fetchError);
          res.status(500).json({ error: 'An error occurred while fetching the data' });
        } else {
          // Send the newly added entry as the response
          res.status(200).json({ faturamento: fetchResult[0] });
        }
      });
    }
  });
});

app.post('/delete-entries-fat', (req, res) => {
  const { ids } = req.body;

  // Here, you need to replace 'faturamento' with the correct table name in your MySQL database
  const deleteQuery = 'DELETE FROM faturamento WHERE id IN (?)';
  const deleteValues = [ids];

  // Execute the delete query using your database connection
  // Replace 'connection' with your actual MySQL connection variable
  connection.query(deleteQuery, [deleteValues], (error, deleteResult) => {
    if (error) {
      console.error('Error deleting entries:', error);
      res.status(500).json({ error: 'An error occurred while deleting the entries' });
    } else {
      console.log('Entries deleted successfully');
      res.status(200).json({ message: 'Entries deleted successfully' });
    }
  });
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
