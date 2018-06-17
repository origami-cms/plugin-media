import path from 'path';
const {mkdir: mkdirAsync} = require('mkdir-recursive');
import fs from 'fs';
import {promisify} from 'util';
import Server, {Route} from 'origami-core-server';
import Media from './models/media';
import {Origami} from 'origami-core-lib';

const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const mkdir = promisify(mkdirAsync);


export interface PluginOptions {
    location: string;
}

interface req extends Origami.Server.Request {
    files?: {
        [key: string]: {
            name: string;
            mimetype: string;
            provider: string;
            data: Buffer;
        }
    };
}

module.exports = async(server: Server, options: PluginOptions) => {

    const location = path.resolve(options.location);
    try {
        await stat(location);
    } catch (e) {
        mkdir(location);
    }

    server.resource('media', {
        model: Media,
        auth: {
            get: false
        },
        controllers: {
            create: async(req: req, res, next) => {
                if (!req.files || !req.files.file) return next(new Error('No files uploaded'));

                const {file} = req.files;

                const m = server.store.model('media');

                try {
                    const data = await m.create({
                        name: file.name,
                        type: file.mimetype,
                        provider: file.provider,
                        author: req.jwt.data.userId
                    }) as {id: string};

                    const fp = path.resolve(location, data.id);
                    writeFile(fp, file.data);
                    res.data = data;

                    next();
                } catch (e) {
                    next(e);
                }
            },
            get: async(req, res, next) => {
                const m = server.store.model('media') as Origami.Store.Model;
                interface MediaResource {
                    id: string;
                    type: string;
                }
                const file = await m.find({id: req.params.mediaId}) as MediaResource;
                if (!file) {
                    res.responseCode = 'resource.errors.notFound';
                    return next();
                }
                res.header('content-type', file.type);
                res.sendFile(path.resolve(location, file.id));
            }
        }
    });
};
