export default {
    properties: {
        id: 'uuid',
        name: {type: String, required: true},
        type: {type: String, required: true},
        provider: {type: String, required: true, default: 'filesystem'},
        author: {type: 'uuid', required: false}
    }
};
