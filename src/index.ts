import {Origami} from 'origami-core-lib';
import Server from 'origami-core-server';
import Media from './models/media';

import * as ProviderS3 from './providers/s3';
import * as ProviderFilesystem from './providers/filesystem';


export type ProviderTypes = 's3' | 'filesystem';
export type PluginOptionsBase = {
    provider: ProviderTypes;
};

export interface PluginOptionsFileSystem extends PluginOptionsBase {
    provider: 'filesystem';
    location?: string;
}
export interface PluginOptionsS3 extends PluginOptionsBase {
    provider: 's3';
    bucket: string;
    key: string;
    secret: string;
}

export type PluginOptions = PluginOptionsFileSystem | PluginOptionsS3;

export interface Provider<T> {
    initialize: (options: T) => any;
    handlerCreate: (options: T) => Origami.Server.RequestHandler;
    handlerGet: (options: T) => Origami.Server.RequestHandler;
}

export interface MediaPostReq extends Origami.Server.Request {
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

    let provider: Provider<PluginOptions>;
    switch (options.provider) {
        case 's3':
            provider = ProviderS3;
            break;

        default:
        case 'filesystem':
            provider = ProviderFilesystem;
            break;
    }

    await provider.initialize(options);


    server.resource('media', {
        model: Media,
        auth: {get: false},
        controllers: {
            create: provider.handlerCreate(options),
            get: provider.handlerGet(options)
        }
    });
};
