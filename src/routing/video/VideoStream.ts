import {Log} from "../../utils/Logger";
import {hexToBytes} from "../../utils/Hex";
import {EntryNode, NodePublicIdentity} from "../../client/Discovery";
import {extractHostAndIP} from "../../utils/AddressExtractor";
import {StreamManager} from "../StreamManager";
import {StreamNamespaceId} from "../../defines/SiriusStream";
import {StreamRelayCell} from "../cell/StreamRelayCell";
import {FanoutMessage, FanoutPayload, FanoutReport, FanoutViewersChange, readFanoutPayload} from "../FanoutPayload";
import * as protobuf from "../../../proto/out/video";
import {initializeRatchet, Ratchet} from "../../enc/Megolm";
import {Uint32} from "../../utils/Binary";
import {MediaProtocol} from "../Identifiers";
import {deserializedFrame, Frame} from "../../media/Frame";

export class Indexes {
    public Idx : number;
    public Time : Date;
}

/// Maximum number of messages that a packet can be split into for fanout
const maxFanoutSplit = 5;

export type OnFrameRecievedCallback = (frame : Frame) => void;

export class VideoStream {
    private streamManager : StreamManager;
    private broadcaster : boolean;
    private ratchet : Ratchet;

    // for bitrate computation
    private viewerReceived : number;
    private viewerLastKey : Date;
    private lastKeyIndex : Array<Indexes>;

    private numRemainingParts : number;
    private partialPayload : Buffer;
    private receivedKeyVideo : boolean;

    private onVideoFrameReceived : OnFrameRecievedCallback;
    private onAudioFrameReceived : OnFrameRecievedCallback;

    constructor() {
        this.numRemainingParts = 0;
        this.receivedKeyVideo = false;
    }

    set OnVideoFrameReceived(callback : OnFrameRecievedCallback) {
        this.onVideoFrameReceived = callback;
    }

    set OnAudioFrameReceived(callback : OnFrameRecievedCallback) {
        this.onAudioFrameReceived = callback;
    }

    createViewer(token : string) {
        this.broadcaster = false;

        let params = token.split("/");
        if(params.length != 4) {
            Log("stream token is invalid");
            return;
        }

        let cookie = hexToBytes(params[3]);
        if(params[2].length != 64 || cookie.length != 32) {
            Log("token content is invalid");
            return;
        }

        let hostIP =  extractHostAndIP(params[1]);
        let entry = new EntryNode(hostIP.host, hostIP.port, params[2]);

        const context = this;
        this.streamManager = new StreamManager();
        this.streamManager.connect(entry, StreamNamespaceId.MediaStreamingProtocol, Buffer.from(cookie), MediaProtocol.Join);
        this.streamManager.OnRelayResult = (rc : StreamRelayCell) => context.onStreamRelay(rc);
        this.streamManager.OnStreamCreated = () => {
            context.setup();
        };
    }

    setup() {
        this.lastKeyIndex = new Array<Indexes>();
        this.viewerLastKey = new Date();
        this.viewerReceived = 0;
    }

    onStreamRelay(rc : StreamRelayCell) {

        const fanout = readFanoutPayload(rc);

        if (this.broadcaster) {
            Log("Broadcaster should not recieve relay message");
            return;
        }

        switch(fanout.MessageType) {
            case FanoutMessage.StreamParameters:
                let msg = protobuf.protocol.VideoStreamParameters.deserialize(fanout.Data);
                if(msg == null) {
                    Log("Unable to deserialized Fanout Payload Stream Parameters");
                    return;
                }

                this.ratchet = initializeRatchet(Buffer.from(msg.ratchet));
                if( this.ratchet == null)
                    Log("Unable to parse incoming ratchet parameters");

                break;

            case FanoutMessage.Report:
                if( fanout.Data.length != 8) {
                    Log("invalid payload in FanoutMessage report");
                    return;
                }

                let report = new FanoutReport();
                report.LastKnownSequenceID = Uint32(fanout.Data);
                report.BytesReceived = Uint32(fanout.Data.slice(4));

               this.onReport(report);

            case FanoutMessage.KeyVideo:
                this.onKeyVideo(fanout);
                break;

            case FanoutMessage.IntermediateVideo:
                this.onIntermediateVideo(fanout);
                break;

            case FanoutMessage.ViewersChanged:
                if( fanout.Data.length != 8) {
                    Log("invalid payload in FanoutMessage.ViewersChanged");
                    return;
                }

                let fanoutView = new FanoutViewersChange();
                fanoutView.Viewers = Uint32(fanout.Data);

                Log("We have "+ fanoutView.Viewers + " viewers now");

                //TODO: trigger callback to user sidde

                break;
            case FanoutMessage.Audio:
                this.onAudio(fanout);
                break;
        }
    }

    appendToPartialPayload( data : Buffer) {
        if(this.partialPayload == null)
            this.partialPayload = data.slice(0);
        else
            this.partialPayload = Buffer.concat([this.partialPayload, data]);

    }

    onKeyVideo(fanout : FanoutPayload) {

        let decrypted = this.ratchet.decrypt(fanout.SequenceID,
            fanout.Data.slice(0, 8), fanout.Data.slice(8));

        if(!decrypted) return;

        decrypted.copy(fanout.Data,8);

        if(fanout.RemainingParts >= maxFanoutSplit) {
            throw("Message has too many parts to split");
        }

        else if(fanout.RemainingParts == 0) {
            if(this.numRemainingParts != 0) {
                this.numRemainingParts = 0;
                throw("Message contains wrong number of segments.");
            }

            let videoFrame = new Frame();
            if(this.partialPayload == null) {
                videoFrame = deserializedFrame(decrypted)
            }
            else{
                this.appendToPartialPayload(decrypted);
                videoFrame = deserializedFrame(this.partialPayload);
            }

            if( this.onVideoFrameReceived)
                this.onVideoFrameReceived(videoFrame);

            this.partialPayload = null;
            this.receivedKeyVideo = true;
        }
        else {
            if(fanout.IsFirst) {
                // first payload of split fanout, save number of chunks we expect
                this.numRemainingParts = fanout.RemainingParts;
            }
            else if(fanout.RemainingParts != this.numRemainingParts) {
               // Reset
                this.numRemainingParts = 0;
                throw("Message contains an invalid segment. Remaining Parts "
                    + fanout.RemainingParts + " Expected " + this.numRemainingParts);
            }

            this.appendToPartialPayload(decrypted);

            // Prepare for next chunk
            this.numRemainingParts -= 1;
        }
    }

    onIntermediateVideo(fanout : FanoutPayload) {
        if(this.receivedKeyVideo) {
            let decrypted = this.ratchet.decrypt(fanout.SequenceID,
                fanout.Data.slice(0, 8), fanout.Data.slice(8));

            if(!decrypted) return;

            decrypted.copy(fanout.Data,8);

            if(fanout.RemainingParts >= maxFanoutSplit) {
                throw("Message has too many parts to split in intermediate video ");
            }

            else if(fanout.RemainingParts == 0) {
                if(this.numRemainingParts != 0) {
                    this.numRemainingParts = 0;
                    throw("Message contains wrong number of segments.");
                }

                let videoFrame = new Frame();
                if(this.partialPayload == null) {
                    videoFrame = deserializedFrame(decrypted)
                }
                else{
                    this.appendToPartialPayload(decrypted);
                    videoFrame = deserializedFrame(this.partialPayload);
                }

                if( this.onVideoFrameReceived)
                    this.onVideoFrameReceived(videoFrame);

                this.partialPayload = null;
            }
            else {
                if(fanout.IsFirst) {
                    // first payload of split fanout, save number of chunks we expect
                    this.numRemainingParts = fanout.RemainingParts;
                }
                else if(fanout.RemainingParts != this.numRemainingParts) {
                    // Reset
                    this.numRemainingParts = 0;
                    throw("Message contains an invalid segment. Remaining Parts "
                        + fanout.RemainingParts + " Expected " + this.numRemainingParts);
                }

                this.appendToPartialPayload(decrypted);
            }
        }
    }

    onReport(report : FanoutReport) {
        let id = new Indexes();
        let found = false;
        while(this.lastKeyIndex.length != 0) {

            id = this.lastKeyIndex[0];
            this.lastKeyIndex = this.lastKeyIndex.slice(1);
            if(id.Idx == report.LastKnownSequenceID) {
                found = true;
                break;
            }
        }

        if(!found)
            Log("Server reporting back received "+report.BytesReceived+" bytes, last key ID " + report.LastKnownSequenceID);
        else {
            let now = Date();
            let time = (Date.now() - id.Time.getTime());
            Log("Server reporting back received " + report.BytesReceived + " bytes,round-trip latency is %" +time+" msec ");
        }
    }

    onAudio(fanout : FanoutPayload) {
        let decrypted = this.ratchet.decrypt(fanout.SequenceID,
            fanout.Data.slice(0, 8), fanout.Data.slice(8));

        if(!decrypted) return;

        decrypted.copy(fanout.Data,8);

        if(fanout.RemainingParts >= maxFanoutSplit) {
            throw("Message has too many parts to split");
        }
        else if(fanout.RemainingParts == 0) {
            if(this.numRemainingParts != 0) {
                this.numRemainingParts = 0;
                throw("Message contains wrong number of segments.");
            }

            let audioFrame = new Frame();
            if(this.partialPayload == null) {
                audioFrame = deserializedFrame(decrypted)
            }
            else{
                this.appendToPartialPayload(decrypted);
                audioFrame = deserializedFrame(this.partialPayload);
            }

            if( this.onAudioFrameReceived)
                this.onAudioFrameReceived(audioFrame);

        }
        else {
            if(fanout.IsFirst) {
                // first payload of split fanout, save number of chunks we expect
                this.numRemainingParts = fanout.RemainingParts;
            }
            else if(fanout.RemainingParts != this.numRemainingParts) {
                // Reset
                this.numRemainingParts = 0;
                throw("Message contains an invalid segment. Remaining Parts "
                    + fanout.RemainingParts + " Expected " + this.numRemainingParts);
            }

            this.appendToPartialPayload(decrypted);

        }

    }
}