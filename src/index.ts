import {Origami} from 'origami-core-lib';
import Server from 'origami-core-server';
import Media from './models/media';
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
}

export type PluginOptions = PluginOptionsFileSystem | PluginOptionsS3;

export interface Provider<T> {
    initialize: (options: T) => any;
    handlerCreate: (options: T) => Origami.Server.RequestHandler;
    handlerGet: (options: T) => Origami.Server.RequestHandler;
}


module.exports = async(server: Server, options: PluginOptions) => {

    let provider: Provider<PluginOptions>;
    switch (options.provider) {
        // case 's3':
        //     provider = ProvidersFilesystem;
        //     break;

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
