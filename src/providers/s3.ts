import aws from 'aws-sdk';
import {Origami} from '@origami/core';
import {MediaPostReq, PluginOptionsS3} from '..';

let s3: aws.S3;
let key: string;

// Setup AWS S3 bucket
export const initialize = async (options: PluginOptionsS3) => {
    key = options.key;

    aws.config.accessKeyId = key;
    aws.config.secretAccessKey = options.secret;

    s3 = new aws.S3({params: {
        Bucket: options.bucket
    }});
};

interface MediaResource {
    id: string;
    type: string;
}

export const handlerCreate = (
    options: PluginOptionsS3
): Origami.Server.RequestHandler =>

    async (req: MediaPostReq, res, next) => {
        if (!req.files) return next(new Error('No files uploaded'));
        const [, file] = Object.entries(req.files)[0];

        const m = res.app.get('store').model('media');

        // Create the object in the database first for the ID
        let data: MediaResource | false = false;
        try {
            data = await m.create({
                name: file.name,
                type: file.mimetype,
                provider: 's3',
                author: req.jwt.data.userId
            }) as MediaResource;

        } catch (e) {
            next(e);
        }

        // Create in S3 with the generated file id
        await new Promise((res, rej) => {
            s3.putObject({Body: file.data, Key: data.id})

                .on('httpUploadProgress', (progress: aws.S3.ProgressEvent) => {
                })

                .send((err: string, data: object) => {
                    if (err) rej(err);
                    res(data);
                });
        });

        if (data) res.locals.content.set(data);
        next();
    };


export const handlerGet = (
    options: PluginOptionsS3
): Origami.Server.RequestHandler =>

    async (req, res, next) => {

        // Lookup file in database first
        const m = res.app.get('store').model('media');

        const file = await m.find({id: req.params.mediaId}) as MediaResource;
        if (!file) {
            res.locals.content.responseCode = 'resource.errors.notFound';
            return next();
        }

        // Stream the file based on the id as the key in S3 bucket
        s3.getObject({Key: file.id})
            .on('httpHeaders', function (statusCode: string, headers: object) {
                // TODO: Set correct headers and handle errors etc
                // res.set('Content-Length', headers['content-length']);
                // res.set('Content-Type', headers['content-type']);
                this.response.httpResponse.createUnbufferedStream()
                    .pipe(res);
            })
            .send();
    };
