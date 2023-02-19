const express = require('express');
const mysql = require('mysql2');

const app = express();

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
  res.send(`
    <html>
      <body>
        <form action="/" method="POST">
          <label for="username">Username:</label>
          <input type="text" name="username" id="username" /><br />
          <label for="password">Password:</label>
          <input type="password" name="password" id="password" /><br />
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/', (req, res) => {
  const { username, password } = req.body;

  // Insert the username and password into the database
  connection.query(
    'INSERT INTO loginuser (user_name, user_pass) VALUES (?, ?)',
    [username, password],
    (error, results, fields) => {
      if (error) {
        console.error('Error inserting data: ' + error.stack);
        res.send('An error occurred while processing your request.');
      } else {
        console.log('Inserted ' + results.affectedRows + ' rows');
        //res.send('Data inserted successfully.');

        console.log("hey");

        connection.query("select * from loginuser where user_name = ? and user_pass = ?", 
        
        [username, password],function(error,results,fields){
            if (results.length > 0){
                res.redirect("./welcome");
            }else{
                console.log("Porraa");
            }
        })
      }
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));