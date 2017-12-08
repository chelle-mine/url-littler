const path = require('path');
const express = require('express');
const app = express();

const shortid = require('shortid');
const validUrl = require('valid-url');

const PORT = process.env.PORT || 3000;

const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGOLAB_URI;
let myDb;

MongoClient.connect(url, (err, client) => {
    if (err) console.log(err);
    
    myDb = client.db('linksdb');
    app.listen(PORT);
});

// set view
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.render('home', {
        domainName: req.protocol + '://' + req.get('host') + '/'
    });
});

// get url as new query
app.get('/new/*', (req, res) => {
    const orig = req.params[0];

    // check if given URL is invalid
    const urlIsValid = validUrl.isHttpUri(orig) || validUrl.isHttpsUri(orig);

    if (urlIsValid) {
        const collection = myDb.collection('links');

        // look up the valid URL
        collection.findOne({original_url: orig}, {fields:{_id: 0}}, (err, doc) => {
            if (err) res.statusCode(500);

            // return doc directly if found
            else if (doc) {
                res.end(JSON.stringify({
                    original_url: doc.original_url,
                    little_url: req.protocol + '://' + req.get('host') + '/' + doc.little_url
                }));
            }

            // create document then return object
            else {
                const littled = shortid.generate();
                collection.insertOne({original_url: orig, little_url: littled}, (err, doc) => {
                    if (err) res.statusCode(500);

                    res.end(JSON.stringify({
                        original_url: orig,
                        little_url: req.protocol + '://' + req.get('host') + '/' + littled
                    }));
                });
            }
        });
    }

    else res.end(JSON.stringify({ error: 'Please enter a valid URL' }));

});

// redirecting to original_url
app.get('/*', (req, res) => {
    const little = req.params[0];
    const collection = myDb.collection('links');

    // look up in db
    collection.findOne({little_url: little}, (err, doc) => {
        if (err) res.statusCode(500);
        else if (doc) res.redirect(302, doc.original_url);
        else res.end(JSON.stringify({
            'error': 'URL not in database'
        }));
    });
});
