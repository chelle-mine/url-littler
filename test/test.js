const expect = require('chai').expect;
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const shortid = require('shortid');

const host = 'http://localhost:3000/';

describe('Interacting with database', () => {
    // empty collection before testing
    before((done) => {
        MongoClient.connect('mongodb://localhost:27017', (err, client) => {
            if (err) console.error(err);

            const db = client.db('linksdb');

            db.collection('links', (err, coll) => {
                if (err) console.error(err);

                coll.removeMany({}, (err, r) => {
                    client.close();
                    done();
                });
            });
        });
    });

    it('Creates a document if not found in collection', (done) => {
        // should return a valid response after creating document
        request(host + 'new/https://www.google.com', (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            console.log(JSON.parse(res.body));
            expect(JSON.parse(res.body)).to.have.all.keys('original_url', 'little_url');
            done();
        });

    });

    it('Queries collection for an existing document', (done) => {
        request(host + 'new/https://www.google.com', (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(JSON.parse(res.body)).to.have.all.keys('original_url', 'little_url');
            done();
        });
    });
    

});

describe('Parsing query', () => {
    let anId = shortid.generate();
    before((done) => {
        MongoClient.connect('mongodb://localhost:27017/linksdb', (err, client) => {
            if (err) console.error(err);
            
            const db = client.db('linksdb');

            db.collection('links', (err, coll) => {
                if (err) console.error(err);

                coll.insertOne({
                    original_url: 'http://fun.haus',
                    little_url: anId
                }, (err, r) => {
                    client.close();
                    done();
                });
            });
        });

    });


    it('Returns INVALID message for incorrect URL', (done) => {
        request(host + 'new/fun.haus', (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.equal('{"error":"Please enter a valid URL"}');
            done();
        });

    });

    it('Redirect valid short url if already in db', (done) => {

        request({
            url: host + anId,
            followRedirect: false
        }, (err, res, body) => {
            expect(res.statusCode).to.equal(302);
            done();
        });

    });

    it('Returns an error message for invalid short url', (done) => {
        request(host + 'link-that-does-not-exist', (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.equal('{"error":"URL not in database"}');
            done();
        });

    });

});

