import {high_resolution_clock} from "../../utils/HighResolutionClock";

export class DecodedImageInfo {
    public width : number;
    public height : number;
    public timestamp : bigint;
    public data : Buffer;
}

export type OnFrameReadyCallback = (image : DecodedImageInfo) => void;

// 60 FPS
const FRAME_RATE = high_resolution_clock.nanosec(1000) / 60n;

export class ViewFrameRateManager {
    private incomingTimeStamp : high_resolution_clock.TimePoint = high_resolution_clock.MIN_VALUE;
    private shutOffAvSync : boolean = false;
    private streamTime : high_resolution_clock.TimePoint =  high_resolution_clock.MIN_VALUE;
    private referenceTime : high_resolution_clock.TimePoint =  high_resolution_clock.MIN_VALUE;
    private frameBehindCount : number = 0;
    private timeSinceLastFrame :  high_resolution_clock.TimePoint = high_resolution_clock.MIN_VALUE;
    private firstFrameSkipped : boolean = false;

    public OnDecodedFrame : OnFrameReadyCallback = null;

    constructor() {
    }

    setTimestamps(ts_from_audio : bigint) {
        if(this.shutOffAvSync) return;

        this.streamTime = ts_from_audio;
        this.referenceTime = high_resolution_clock.now();

        this.timeSinceLastFrame = FRAME_RATE;
        this.firstFrameSkipped = false;
    }

    process(image : DecodedImageInfo, incomingTimeStamp : high_resolution_clock.TimePoint) {

        if(incomingTimeStamp == high_resolution_clock.MIN_VALUE) {
            return;
        }

        let now = high_resolution_clock.now();
        let elapsed = now - this.referenceTime;
        this.referenceTime = now;

        if(incomingTimeStamp >= this.streamTime && this.firstFrameSkipped != false) {

             this.timeSinceLastFrame -= elapsed;

             if(this.timeSinceLastFrame <= 0) {
                 this.timeSinceLastFrame = FRAME_RATE;

                 if(this.OnDecodedFrame)
                     this.OnDecodedFrame(image);
             }
        }

        this.streamTime += elapsed;
        this.firstFrameSkipped = true;
    }
}