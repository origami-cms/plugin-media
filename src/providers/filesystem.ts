import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {PluginOptionsFileSystem} from '../';
import {Origami} from 'origami-core-lib';

const {mkdir: mkdirAsync} = require('mkdir-recursive');
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const mkdir = promisify(mkdirAsync);

let location: string;

export const initialize = async (options: PluginOptionsFileSystem) => {
    location = path.resolve(process.cwd(), options.location || 'media');

    try {
        await stat(location);
    } catch (e) {
        mkdir(location);
    }
};


export interface req extends Origami.Server.Request {
    files?: {
        [key: string]: {
            name: string;
            mimetype: string;
            provider: string;
            data: Buffer;
        }
    };
}


export const handlerCreate = (
    options: PluginOptionsFileSystem
): Origami.Server.RequestHandler =>

    async (req: req, res, next) => {
        if (!req.files) return next(new Error('No files uploaded'));

        const [, file] = Object.entries(req.files)[0];

        const m = res.app.get('store').model('media');

        try {
            const data = await m.create({
                name: file.name,
                type: file.mimetype,
                provider: file.provider,
                author: req.jwt.data.userId
            }) as { id: string };

            const fp = path.resolve(location, data.id);
            writeFile(fp, file.data);
            res.data = data;

            next();
        } catch (e) {
            next(e);
        }
    };


export const handlerGet = (
    options: PluginOptionsFileSystem
): Origami.Server.RequestHandler =>

    async (req, res, next) => {
        const m = res.app.get('store').model('media');
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
    };
