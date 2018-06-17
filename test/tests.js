const {Origami} = require('origami-cms');
const chai = require("chai");
const fs = require("fs");
const {promisify} = require("util");
const path = require("path");
const chaiAsPromised = require("chai-as-promised");
const chaiHttp = require('chai-http');

var {expect} = chai;
var should = chai.should();
chai.use(chaiAsPromised);
chai.use(chaiHttp);

const stat = promisify(fs.stat);
const read = promisify(fs.readFile);


const app = new Origami({
    "app": {
        "name": "test"
    },
    "store": {
        "type": "mongodb",
        "host": "localhost",
        "port": "27017",
        "database": "origami-plugin-media-test",
        "username": "origami",
        "password": "origami"
    },
    "server": {
        "port": 9999,
        "secret": "37054f5ec40817ce0273769599fe4cf7"
    },
    "plugins": {
        "./build/index": {
            "location": "./test/media"
        }
    }
});


const UPLOAD_NAME = 'img.png';
const UPLOAD_TYPE = 'image/png';

const upload = token => chai.request(app.server.app)
    .post('/api/v1/media')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', fs.readFileSync(path.resolve(__dirname, UPLOAD_NAME)), UPLOAD_NAME)
    .then(res => {
        expect(res).to.be.json;
        expect(res.body.data).to.exist;
        expect(res.body.data.id).to.exist;
        return res;
    });


const list = token => chai.request(app.server.app)
    .get('/api/v1/media')
    .set('Authorization', `Bearer ${token}`)
    .then(res => {
        expect(res).to.be.json;
        expect(res.body.data).to.be.an('array')
        return res;
    });

const get = (token, id) => chai.request(app.server.app)
    .get(`/api/v1/media/${id}`)
    .set('Authorization', `Bearer ${token}`)

const remove = (token, id) => chai.request(app.server.app)
    .delete(`/api/v1/media/${id}`)
    .set('Authorization', `Bearer ${token}`)


before(done => app.ready(done));


describe('Origami Plugin: Media', () => {
    let token;
    let userID;
    let mediaID;

    after(done => {
        app.server.stop();
        done();
    });

    describe('Setup Origami', () => {
        it('should run', () => {
            should.exist(app.server);
        });

        it('should setup first user', done => {
            chai.request(app.server.app)
                .post('/api/v1/setup/user')
                .send({
                    "fname": "Origami",
                    "lname": "Test",
                    "email": "bot@origamicms.com",
                    "password": "origami"
                })
                .then(res => {
                    expect(res).to.be.json;
                    expect(res.body.data).to.exist
                    expect(res.body.data.email).to.equal('bot@origamicms.com');
                    userID = res.body.data.id;
                    done();
                })
        });

        it('should login', done => {
            chai.request(app.server.app)
                .post('/api/v1/auth/login')
                .send({
                    "email": "bot@origamicms.com",
                    "password": "origami"
                })
                .then(res => {
                    expect(res).to.be.json;
                    expect(res.body.data).to.exist;
                    expect(res.body.data.token).to.exist;
                    ({token} = res.body.data);
                    done();
                })
                .catch(done);
        });
    })

    describe('POST /api/v1/media', () => {
        it('should have initial list length of 0', done => {
            list(token)
                .then(res => {
                    expect(res.body.data).to.have.lengthOf(0);
                    done();
                });
        });
        it('should create a media directory', done => {
            upload(token)
                .then(async res => {
                    const fp = path.resolve(__dirname, `./media`);
                    ((await stat(fp)).isDirectory()).should.equal(true);
                    done();
                });
        });
        it('should upload file and store in file system', done => {
            upload(token)
                .then(async res => {
                    const fp = path.resolve(__dirname, `./media/${res.body.data.id}`);
                    ((await stat(fp)).isFile()).should.equal(true);
                    done();
                });
        });
        it('should upload file and store in file system', done => {
            upload(token)
                .then(async res => {
                    const fp = path.resolve(__dirname, `./media/${res.body.data.id}`);
                    ((await stat(fp)).isFile()).should.equal(true);
                    done();
                });
        });
        it('should create media resource with the right author', done => {
            upload(token)
                .then(async res => {
                    expect(res.body.data.author).to.equal(userID);
                    done();
                });
        });
        it('should return a media resource with correct JSON shape', done => {
            upload(token)
                .then(async res => {
                    expect(res.body.data).to.own.include({
                        name: UPLOAD_NAME,
                        type: UPLOAD_TYPE,
                        provider: 'filesystem'
                    });
                    expect(res.body.data).to.have.property('createdAt');
                    mediaID = res.body.data.id;
                    done();
                });
        });
    });


    describe('GET /api/v1/media', () => {
        it('should return a list of media resources', done => {
            list(token)
                .then(res => {
                    const PREVIOUS_CALLS = 5;
                    expect(res.body.data).to.have.lengthOf(PREVIOUS_CALLS);
                    expect(res.body.data).to.have.nested.property('[0].id');
                    expect(res.body.data).to.have.nested.property('[0].name', UPLOAD_NAME);
                    expect(res.body.data).to.have.nested.property('[0].type', UPLOAD_TYPE);
                    expect(res.body.data).to.have.nested.property('[0].createdAt');
                    expect(res.body.data).to.have.nested.property('[0].author', userID);
                    expect(res.body.data).to.have.nested.property('[0].provider', 'filesystem');
                    done();
                });
        });
    });


    describe('GET /api/v1/media/:id', () => {
        it('should return a 404 for wrong ID', done => {
            get(token, 'wontwork')
                .then(res => {
                    expect(res.body).to.own.include({
                        statusCode: 404,
                        message: 'Resource not found'
                    });
                    done();
                });
        });
        it('should return a stream for a file', done => {
            get(token, mediaID)
                .then(res => {
                    expect(Buffer.isBuffer(res.body)).to.be.true;
                    expect(res).to.have.property('type', UPLOAD_TYPE);
                    done();
                });
        });
        it('should stream the right file', done => {
            get(token, mediaID)
                .then(async res => {
                    expect(res.body.toString()).to.equal((await read(path.resolve(__dirname, UPLOAD_NAME))).toString());
                    done();
                });
        });
    });

    describe('DELETE /api/v1/media/:id', () => {
        it('should delete a media resource', done => {
            remove(token, mediaID)
                .then(res => {
                    expect(res.body).to.own.include({
                        statusCode: 200,
                        message: 'Successfully deleted resource'
                    });
                    done();
                });
        });
        it('should return a 404 for deleted resource', done => {
            get(token, mediaID)
                .then(res => {
                    expect(res.body).to.own.include({
                        statusCode: 404,
                        message: 'Resource not found'
                    });
                    done();
                });
        });
    });
});
