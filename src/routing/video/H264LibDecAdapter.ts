// H264lib_opencore web assembly glue codde

import Module = require("../../3rd-party/h264lib_opencorex/h264lib_opencore");
import {Frame, LayerCount, FrameType} from "../../media/Frame";
import {Log} from "../../utils/Logger";
import {DecodedImageInfo, ViewFrameRateManager, OnFrameReadyCallback} from "./ViewFrameRateManager";
import {high_resolution_clock} from "../../utils/HighResolutionClock";

let h264DecoderReady: boolean = false;

let createViewer : any = null;
let shutdown : any = null;
let processFirstH264Frame: any = null;
let processH264Frame: any = null;
let getH264Width: any = null;
let getH264Height: any = null;

Module['onRuntimeInitialized'] = function() {
    h264DecoderReady = true;

    createViewer = Module.cwrap("CreateViewer", "number", null);
    shutdown = Module.cwrap("Shutdown", null, null);
    processFirstH264Frame = Module.cwrap("ProcessFirstH264Frame", "number",
        ["number","number", "number","number","number","number","number","number"]);

    processH264Frame = Module.cwrap("ProcessH264Frame", "number",
        ["number","number", "number","number","number"]);

    getH264Width = Module.cwrap("GetH264Width", "number", ["number"]);
    getH264Height = Module.cwrap("GetH264Height", "number", ["number"]);
};

export class H264LibDecAdapter {
    private id : number;
    private useFrameRater : boolean = true;

    private firstH264FrameSent : boolean = false;
    private buf : Uint8Array;
    private jig: Buffer;
    private jig_ptr : any = null;
    private processingFrameType : number;
    private ShapeWidth : number = -1;
    private ShapeHeight  : number = -1;
    private intendedWidth  : number = 0;
    private intendedHeight  : number = 0;

    public OnDecodedFrame : OnFrameReadyCallback = null;

    private incomingTimeStamp : high_resolution_clock.TimePoint = high_resolution_clock.MIN_VALUE;
    private frameRateManager : ViewFrameRateManager;
    private initialized : boolean = false;

    init(useFrameRater : boolean = true) {
        this.useFrameRater = useFrameRater;

        if(!h264DecoderReady) {
            Log("WASM for h264 was not yet loaded");
            return;
        }

        this.initDecoder();
        this.frameRateManager = new ViewFrameRateManager();

        this.initialized = true;
    }

    initDecoder() {
        this.firstH264FrameSent = false;
        this.id = createViewer();

        this.jig = Buffer.alloc(1920 * 1080 * 3);
        this.jig_ptr = Module._malloc(this.jig.length * this.jig.BYTES_PER_ELEMENT);
    }

    deInit() {
        Module._free(this.jig_ptr);
        shutdown();
    }

    processPacket(p : Frame) : boolean {

        if(this.incomingTimeStamp == high_resolution_clock.MIN_VALUE) {
            this.incomingTimeStamp = BigInt(p.TimeStamp);
            this.frameRateManager.setTimestamps(this.incomingTimeStamp - high_resolution_clock.nanosec(250)); // 250ms
        }
        else {
            this.incomingTimeStamp = BigInt(p.TimeStamp);
        }

        let found = false;
        for(let i = 0; i < LayerCount; i++) {
            if(p.Bytes[i].length > 0) {
                this.buf = p.Bytes[i].slice(0);
                found = true;
                break;
            }
        }

        if(!found) {
            Log("Problem with missing data on all 3 layers");
            this.processingFrameType = 3;
            return false;
        }

        let ret = false;
        switch(p.FrameType) {
            case FrameType.VIDEO_I:
                break;
            case FrameType.VIDEO_IDR:
                this.processingFrameType = 0; // IDR Frame
                ret = true;
                break;
            case FrameType.VIDEO_B:
            case FrameType.VIDEO_P:
                this.processingFrameType = 2; // intermediate frame
                ret = true;
                break;
            default:
                this.processingFrameType = 3; // unknown Frame
                Log("Problem with unknown frame type");
                ret = false;
                break;
        }

        return ret;
    }

    makeFrame() : boolean {
        let ret = true;
            if(!this.firstH264FrameSent) {
                // Call this the first time with nullptr for the 3rd parameter.   This simply
                // inspects the packet for its size.  Then proceed to an actual decoded frame...
                // This fills in:  this.intendedWidth and this.intendedHeight properly...
                var width_ptr = Module._malloc(4);
                var height_ptr = Module._malloc(4);
        
                var buf_ptr = Module._malloc(this.buf.length * this.buf.BYTES_PER_ELEMENT);
                Module.HEAPU8.set(this.buf, buf_ptr);
                ret = processFirstH264Frame(this.id, buf_ptr, this.buf.length, null, 0, width_ptr, height_ptr, 1);
        
                // Could not read the SPS so could not get the dimensions of the IDR Frame.
                // Severe problem and requires a bugout.
                if (!ret) {
                    return false;
                }
        
                // compute correct size
                this.intendedWidth = Module.getValue(width_ptr, "i32"); // extract the result from WASM memory
                this.intendedHeight = Module.getValue(height_ptr, "i32"); // extract the result from WASM memory
        
                ret = processFirstH264Frame(this.id, buf_ptr, this.buf.length, this.jig_ptr, 0, width_ptr, height_ptr, 1);
        
                Module._free(width_ptr);
                Module._free(height_ptr);
                Module._free(buf_ptr);
        
                if(ret) {
                    this.firstH264FrameSent = true;
                    this.ShapeWidth = this.intendedWidth;
                    this.ShapeHeight = this.intendedHeight;
        
                    //TODO:  on size changed trigger event to user side
                }
            }
            else {
                var buf_ptr = Module._malloc(this.buf.length * this.buf.BYTES_PER_ELEMENT);
                Module.HEAPU8.set(this.buf, buf_ptr);
                let ret = processH264Frame(this.id, buf_ptr, this.buf.length, this.jig_ptr, 1);
                Module._free(buf_ptr);
        
                if(ret && this.processingFrameType == 0 ) { // *IDR Frame
                    let sw = getH264Width(this.id);
                    let sh = getH264Height(this.id);
                    // resolution change detection
                    if (sw != this.intendedWidth || sh != this.intendedHeight)
                    {
                        this.intendedWidth = sw;
                        this.intendedHeight = sh;
        
                        // set this.firstH264FrameSent to false here and do recursive call
                        // to reinit decoder with decoderMain->processFirstH264Frame
                        this.firstH264FrameSent = false;
        
                        return this.makeFrame();
                    }
                }
            }
        
            if(ret) {
                let imageSize = this.intendedWidth * this.intendedHeight * 3 / 2;
                let output = new Uint8Array(Module.HEAPU8.buffer, this.jig_ptr, imageSize);

                let image = new DecodedImageInfo();
                image.width = this.intendedWidth;
                image.height = this.intendedHeight;
                image.data = Buffer.from(output);
                image.timestamp = this.incomingTimeStamp;

                if(this.useFrameRater) {
                    this.frameRateManager.OnDecodedFrame = this.OnDecodedFrame;
                    this.frameRateManager.process(image, this.incomingTimeStamp);
                }
                else {
                    if(this.OnDecodedFrame)
                        this.OnDecodedFrame(image);
                }
            }
       
        return true;
    }

    decodeFrame(frame : Frame) {
        if(!h264DecoderReady)
            return;

        if(!this.initialized) {
            this.init(this.useFrameRater);
        }

        if(this.processPacket(frame))
            this.makeFrame();
    }
}