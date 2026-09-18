const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const adminRoutes = require('./routes/admin');
const confirmRoutes = require('./routes/confirm');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 },
  })
);

app.get('/', (req, res) => res.redirect('/admin'));
app.use('/admin', adminRoutes);
app.use('/confirm', confirmRoutes);

app.use((req, res) => res.status(404).send('Not found'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

app.listen(config.port, () => {
  console.log(`Management Tools running at ${config.baseUrl} (listening on port ${config.port})`);
});
