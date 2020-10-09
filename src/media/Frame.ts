import * as protobuf from "../../proto/out/video";
import {Log} from "../utils/Logger";
import {stringToAsciiByteArray} from "../utils/Hex";

export enum Orientation {
    rotate0 =  0,
    rotate90= 90,
    rotate180 = 180,
    rotate270 = 270
};

export enum FrameType{
    AUDIO = 0,
    VIDEO_IDR = 1,
    VIDEO_I = 2,
    VIDEO_P = 3,
    VIDEO_B = 4,
    AUDIO_C = 5,
    VIDEO_C = 6
};

export const LayerCount = 3;

export class Frame {
    public FrameType : FrameType;
    public TimeStamp : bigint;
    public Sequence : number;

    public Uid : number;
    public Bytes : Array<Uint8Array>;
    public Orientation : Orientation;

    constructor() {
        this.Orientation = Orientation.rotate0;
    }
}

export function deserializedFrame(data : Buffer) : Frame{
    let frame = protobuf.protocol.Frame.deserialize(data);
    if(frame == null) {
        Log("Unable to deserialized Frame");
        return null;
    }

    let numLayers = frame.layers.length;
    if(numLayers > LayerCount) {
        Log("Received too many layers. Max layers is " + LayerCount
            + " received "+ numLayers + " layers. Skipping any extra layers...");
        numLayers = LayerCount;
    }
    else if(numLayers == 0) {
        Log("Received zero layers");
    }

    let frameBytes = new Array<Uint8Array>(3);
    for(let index = 0; index < numLayers; ++index) {
       let frameLayer = frame.layers[index];
       frameBytes[index] = frameLayer;
    }

    let videoFrame = new Frame();
    videoFrame.FrameType = frame.frameType != undefined? frame.frameType : 0;
    videoFrame.Sequence = frame.sequenceID;
    videoFrame.Orientation = frame.orientation;
    videoFrame.Bytes = frameBytes;

    // time stamp is received as a C++ high resolution clock in nano seconds
    // use C++ wasm library helper to manipulate this instead
    // protobuf generate time stamp as number, needs to be manualy set after
    // generation to be sure
    videoFrame.TimeStamp = frame.timestamp;

    return videoFrame;
}