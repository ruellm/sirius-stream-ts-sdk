import Module = require("../../3rd-party/libspeex/libspeex");

let create : any = null;
let decompress : any = null;
let getSamplingRate : any = null;
let getFrameSize : any = null;
let destroy : any = null;
let onLibReady : () => void  = null;

Module['onRuntimeInitialized'] = function() {
    create = Module.cwrap("create", "number", ["number"]);
    decompress = Module.cwrap("decompress", "number", ["number", "number", "number"]);
    getSamplingRate = Module.cwrap("getSamplingRate", "number", ["number"]);
    getFrameSize = Module.cwrap("getFrameSize", "number", ["number", "number"]);
    destroy = Module.cwrap("destroy", null, ["number"]);

    if(onLibReady) onLibReady();
};

export class SpeexAdapter {
    private id : number;
    private samplingRate : number;
    private frameSize : number;
    private readyCallback : () => void;

    constructor() {
    }

    initialize( onReady : () => void ) {
        var context = this;

        if(create == null) {
            this.readyCallback = onReady;
            onLibReady = ()=> {
                context.setup();
            };
        }else{
            this.setup();
        }
    }

    setup() {
        let quality = 2;
        this.id = create(quality);
        this.samplingRate = getSamplingRate(quality);
        this.frameSize = getFrameSize(this.id, quality);

        if(this.readyCallback)
            this.readyCallback();
    }

    deinitialize() {
        destroy(this.id);
    }

    decompress(buffer : Uint8Array) : Uint8Array {
        var buf_ptr = Module._malloc(buffer.length * buffer.BYTES_PER_ELEMENT);
        Module.HEAPU8.set(buffer, buf_ptr);

        let size = decompress(this.id, buffer.length, buf_ptr);
        return new Uint8Array(Module.HEAPU8.buffer, buf_ptr, size * 2);
    }

    get SamplingRate() {
        return this.samplingRate;
    }

    get FrameSize() {
        return this.frameSize;
    }
}