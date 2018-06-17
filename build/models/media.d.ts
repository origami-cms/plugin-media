declare const _default: {
    properties: {
        id: string;
        name: {
            type: StringConstructor;
            required: boolean;
        };
        type: {
            type: StringConstructor;
            required: boolean;
        };
        provider: {
            type: StringConstructor;
            required: boolean;
            default: string;
        };
        author: {
            type: string;
            required: boolean;
        };
    };
};
export default _default;
