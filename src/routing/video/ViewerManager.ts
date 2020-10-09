import {VideoStream} from "./VideoStream";
import {Frame, FrameType} from "../../media/Frame";
import {H264LibDecAdapter} from "./H264LibDecAdapter";
import {OnFrameReadyCallback} from "./ViewFrameRateManager";
import {OnAudioReadyCallback, PalAudio} from "../audio/PalAudio";


//TODO: to be implemented
// 1. cleanup interface, H264 adapter needs to cleanup
// 3. de initialize and cleanup h264 and speex adapters
export class ViewerManager {
    private videoStream : VideoStream
    private h264Decoder : H264LibDecAdapter;
    public OnVideoFrameReady : OnFrameReadyCallback;
    public OnAudioFrameReady : OnAudioReadyCallback;
    private palAudio : PalAudio;

    public UseFrameRater : boolean = true;

    constructor(){}

    createViewer(token : string) {
        var context = this;

        this.videoStream = new VideoStream();
        this.videoStream.createViewer(token);
        this.videoStream.OnVideoFrameReceived = (frame : Frame) => context.onVideoFrameReceived(frame);
        this.videoStream.OnAudioFrameReceived = (frame : Frame) => context.onVideoFrameReceived(frame);

        this.h264Decoder = new H264LibDecAdapter();
        this.h264Decoder.init(this.UseFrameRater);

        this.palAudio = new PalAudio();
        this.palAudio.launch();
    }

    onVideoFrameReceived(f : Frame) {
        switch (f.FrameType) {
            case FrameType.VIDEO_I:
            case FrameType.VIDEO_IDR:
            case FrameType.VIDEO_B:
            case FrameType.VIDEO_P:
                // process with H264 decoder
                this.h264Decoder.OnDecodedFrame = this.OnVideoFrameReady;
                this.h264Decoder.decodeFrame(f);
                break;
            case FrameType.VIDEO_C:
            case FrameType.AUDIO_C:
                throw("Unsupported audio/video type");

            case FrameType.AUDIO:
                this.palAudio.OnAudioReceived = this.OnAudioFrameReady;
                this.palAudio.frameReceived(f);
                break;

            default:
                break;
        }
    }

}