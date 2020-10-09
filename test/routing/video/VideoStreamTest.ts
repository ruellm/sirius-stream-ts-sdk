import {VideoStream} from "../../../src/routing/video/VideoStream";
import {FanoutPayload} from "../../../src/routing/FanoutPayload";
import {Ratchet} from "../../../src/enc/Megolm";
import {ViewerManager} from "../../../src/routing/video/ViewerManager";
import {performance} from "perf_hooks";
import {high_resolution_clock} from "../../../src/utils/HighResolutionClock";

function seconds_since_epoch(d){
    return Math.floor( d / 1000 );
}


describe('Videoviewer test', () => {
    it('can create viewer', () => {
        let viewr = new ViewerManager();
        viewr.OnVideoFrameReady = (frame) =>{
            console.log("Frame received");
        };

        viewr.createViewer("token/d9304f76dba0:7012/9F5CF178ACEA4BFE3C369C3EFDE4CC37CC3749F577AA6847FD5A1DFCEE6489C1/2B83079C6906B02B7E4873991FE085B29140918EE352107D2AEEF626500FA58E");
    })
});