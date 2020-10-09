import {Frame} from "../../media/Frame";
import {Uint32} from "../../utils/Binary";
import {SpeexAdapter} from "./SpeexAdapter";

const fs = require('fs');
let count = 0;

export type OnAudioReadyCallback =  (dcb : Uint8Array, samplingRate : number, frameSize : number, timestamp : bigint) => void;

export class PalAudio {
    private speexAdapter : SpeexAdapter;
    public OnAudioReceived : OnAudioReadyCallback;

    constructor() {
        //...
    }

    launch() {
        // execute setInterval
        var context = this;
        this.speexAdapter = new SpeexAdapter();
        this.speexAdapter.initialize(null);
    }

    frameReceived(f : Frame) {
        // extract the data,
        // in C++ there is soundbuf structure defined media.hpp
        // with
        // struct soundbuf
        // {
        //
        //     uint32_t compression;
        //
        //     char sendinghost[16];
        //
        //     struct
        //     {
        //         uint32_t buffer_len;
        //         char buffer_val[BUFL];
        //     } buffer;
        // };
        let bufferB = Buffer.from(f.Bytes[0]);
        let bufferLen = Uint32(bufferB, 20);
        let buffer = bufferB.slice(24);
        let decodedBuffer = this.speexAdapter.decompress(buffer);

       // let fname = "/Users/ruellmagpayo/dump/speex_data/hail_marry/output_" + count++;
      //  fs.writeFileSync(fname, decodedBuffer);
        if(this.OnAudioReceived)
            this.OnAudioReceived(decodedBuffer, this.speexAdapter.SamplingRate,
                this.speexAdapter.FrameSize, f.TimeStamp);
    }
}