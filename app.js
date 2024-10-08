const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const multer = require('multer')
const upload = multer()
const jsonWebToken = require('jsonwebtoken')
const { expressjwt: jwt } = require("express-jwt");
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const config = require('./config');

mongoose.connect(config.mongoURI)
    .then(() => console.log('Connected!'));

const Schema = mongoose.Schema;

const movieSchema = new Schema({
    movietitle: String,
    movieyear: Number,
});

const Movie = mongoose.model('Movie', movieSchema)
// const title = "Terminator"
// const year = 1984

// const title = faker.lorem.sentence(5)
// const year = Math.floor(Math.random() * 80) + 1950

// const myMovie = new Movie({ movietitle: title, movieyear: year })

// myMovie.save().then((response) => console.log(response));

const secret = config.jwtSecret

app.use('/static', express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(
    jwt({
        secret: secret,
        algorithms: ["HS256"],
    }).unless({ path: ["/login", "/", "/movies", "/movies-details", "/movie-search", new RegExp('/movies.*/', 'i')] })
);
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401);
        res.render('unauthorized', { message: 'Access denied. You are not authorized to view this page.' });
    } else {
        next(err);
    }
});
app.use((err, req, res, next) => {
    res.status(500).send('Something went wrong!');
});

app.set('views', './views');
app.set('view engine', 'ejs');

let movies

app.get('/movies', async (req, res) => {
    const title = "Listes des films";
    // movies = [
    //     { title: 'Le fabuleux destin d\'Amélie Poulin', year: 2001 },
    //     { title: 'Buffet froid', year: 1979 },
    //     { title: 'Le dinner de cons', year: 1998 },
    //     { title: 'De rouille et d\'os', year: 2012 },
    // ];

    await Movie.find()
        .then((response) => {
            movies = response
        })
        .catch((err) => console.err(err))

    // res.send('Bientôt des films ici');
    res.render('movies', { movies: movies, title: title })
})

var urlencodedParser = bodyParser.urlencoded({ extended: false })

// app.post('/movies', urlencodedParser, (req, res) => {
//     console.log(req.body)

//     const newMovie = { title: req.body.movietitle, year: req.body.movieyear }
//     // movies.push(newMovie)
//     movies = [...movies, newMovie]
//     console.log(movies)

//     res.sendStatus(201)
// })

app.post('/movies', upload.fields([]), (req, res) => {
    if (!req.body) {
        return res.sendStatus(501)
    } else {
        const formData = req.body
        console.log('formData : ', formData)
        // const newMovie = { title: req.body.movietitle, year: req.body.movieyear }
        // movies = [...movies, newMovie]
        // console.log(movies)

        // Mongo
        const myMovie = new Movie({ movietitle: req.body.movietitle, movieyear: req.body.movieyear })
        myMovie.save()
            .then((response) => {
                console.log(response)
                res.sendStatus(201)
            })
            .catch((err) => {
                console.error("There's an error :", err)
                return
            })
    }
})

app.get('/movie-search', (req, res) => {
    res.render('movie-search')
})

app.get('/movies/add', (req, res) => {
    res.send(`Bientôt un formulaire ici`);
})

app.get('/movies/:id', (req, res) => {
    const id = req.params.id;
    Movie.findById(id).exec().then((response) => {
        console.log("Response :", response)
        res.render('movies-details', { movieId: response._id, movie: response })
    }).catch((err) => {
        console.error("Error :", err)
        res.status(500).send("Update error");
    })
})

app.post('/movies/:id', (req, res) => {
    if (!req.body) {
        return res.status(404).send("Movie not found");
    }
    console.log({ movietitle: req.body.movietitle, movieyear: req.body.movieyear })
    const id = req.params.id;
    Movie.findByIdAndUpdate(id, { $set: { movietitle: req.body.movietitle, movieyear: req.body.movieyear } }, { new: true }).then((response) => {
        console.log("Response :", response)
        res.redirect('/movies/' + id)
    }).catch((err) => {
        console.error("Error :", err)
        res.status(500).send("Update error");
    })
})

app.put('/movies/:id', (req, res) => {
    if (!req.body) {
        return res.status(404).send("Movie not found");
    }
    console.log({ movietitle: req.body.movietitle, movieyear: req.body.movieyear })
    const id = req.params.id;
    Movie.findByIdAndUpdate(id, { $set: { movietitle: req.body.movietitle, movieyear: req.body.movieyear } }, { new: true }).then((response) => {
        console.log("Response :", response)
        res.redirect('/movies')
    }).catch((err) => {
        console.error("Error :", err)
        res.status(500).send("Update error");
    })
})

app.delete('/movies/:id', (req, res) => {
    const id = req.params.id;
    Movie.findByIdAndDelete(id).then((response) => {
        console.log("Response :", response)
        res.status(202).send(response);
    }).catch((err) => {
        console.error("Error :", err)
        res.status(500).send("Delete error");
    })
})

app.get('/', function (req, res) {
    // res.send('Hello <b>world</b>');
    res.render('index');
})

app.get('/login', (req, res) => {
    res.render('login', { title: "Espace membre" })
})

const users = { email: "tsilanmjr@gmail.com", password: "123456789" };

app.post('/login', upload.fields([]), (req, res) => {
    console.log("login post", req.body); // Should now print the parsed body
    if (!req.body) {
        res.sendStatus(501);
    } else {
        if (users.email === req.body.email && users.password === req.body.password) {
            const myToken = jsonWebToken.sign({ iss: 'http://localhost:3000', user: 'Sam', scope: 'client' }, secret)
            // res.json({
            //     email: "tsilanmjr@gmail.com",
            //     favoriteMovie: "Deadpool",
            //     lastLoginDate: new Date().toLocaleDateString()
            // });
            res.json(myToken)
        } else {
            res.sendStatus(401);
        }
    }
});

app.get('/member-only', (req, res) => {
    console.log("req.auth :", req.auth)
    res.send(req.headers)
})

const PORT = config.port

app.listen(PORT, function () {
    console.log(`listening in port ${PORT}`);
})