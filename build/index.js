"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const { mkdir: mkdirAsync } = require('mkdir-recursive');
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const media_1 = __importDefault(require("./models/media"));
const writeFile = util_1.promisify(fs_1.default.writeFile);
const stat = util_1.promisify(fs_1.default.stat);
const mkdir = util_1.promisify(mkdirAsync);
module.exports = (server, options) => __awaiter(this, void 0, void 0, function* () {
    const location = path_1.default.resolve(options.location);
    try {
        yield stat(location);
    }
    catch (e) {
        mkdir(location);
    }
    server.resource('media', {
        model: media_1.default,
        auth: {
            get: false
        },
        controllers: {
            create: (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                if (!req.files || !req.files.file)
                    return next(new Error('No files uploaded'));
                const { file } = req.files;
                const m = server.store.model('media');
                try {
                    const data = yield m.create({
                        name: file.name,
                        type: file.mimetype,
                        provider: file.provider,
                        author: req.jwt.data.userId
                    });
                    const fp = path_1.default.resolve(location, data.id);
                    writeFile(fp, file.data);
                    res.data = data;
                    next();
                }
                catch (e) {
                    next(e);
                }
            }),
            get: (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                const m = server.store.model('media');
                const file = yield m.find({ id: req.params.mediaId });
                if (!file) {
                    res.responseCode = 'resource.errors.notFound';
                    return next();
                }
                res.header('content-type', file.type);
                res.sendFile(path_1.default.resolve(location, file.id));
            })
        }
    });
});
