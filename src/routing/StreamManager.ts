import {EntryNode} from "../client/Discovery";
import {OnionClientConnection} from "../client/OnionClientConnection";
import {ApplicationMessageProcessor} from "./ApplicationMessage";
import {generateCircId} from "./circuit/CircuitCrypto";
import {StreamCreateCell} from "./cell/StreamCreateCell";
import {StreamNamespaceId} from "../defines/SiriusStream";
import {BuildAndSend} from "./Cell";
import * as defines from "./Identifiers";
import {ParserResult} from "./CellParser";
import {Log} from "../utils/Logger";
import {StreamDestroyCell} from "./cell/StreamDestroyCell";
import {StreamRelayCell} from "./cell/StreamRelayCell";

export type OnStreamResult = (data : Buffer) => void;
export type OnRelayResult = (StreamRelayCell) => void;

export class StreamManager {
    private streamID : number;
    private client : OnionClientConnection;
    private moduleName : string;
    private onStreamCreated : () => void;
    private appMessagePrcessor : ApplicationMessageProcessor;
    private onStreamResult : OnStreamResult;
    private onRelayResult : OnRelayResult;

    constructor() {}

    connect(entry : EntryNode, streamNamespace : number, cookie? : Buffer, subcmd? : number) {
        var context = this;
        this.client = new OnionClientConnection();

        this.client.connect(entry.Address, entry.Port, entry.FingerPrint,() => {
            context.streamID = generateCircId(1);
            let cell = new StreamCreateCell(context.streamID, streamNamespace, cookie, subcmd);
            BuildAndSend(context.client.Sender, cell);
            context.registerEvents();
        });
    }

    registerEvents() {
        this.moduleName = "StreamManager" + this.streamID;
        var context = this;

        this.client.Dispatcher.addEventHandler(defines.Command.StreamCreated, sc => {
            if( this.onStreamCreated )
                context.onStreamCreated();
        }, this.moduleName );

        this.client.Dispatcher.addEventHandler(defines.Command.StreamRelay, sc => {
            context.handleStreamRelay(sc);
        }, this.moduleName);
    }

    set OnStreamCreated(callback : () => void) {
        this.onStreamCreated = callback;
    }

    sendToStream(data) {
        let msgs = this.appMessagePrcessor.buildStreamOutput(data);
        for(let i = 0; i < msgs.length; i++) {
            var cell = msgs[i];
            cell.setCircID(this.streamID);
            this.client.Sender.send(cell);
        }
    }

    handleStreamRelay(p : ParserResult) {
        if(p.error != null) {
            Log("Unable to process the stream message: " + p.error);

            let destroy = new StreamDestroyCell(this.streamID, defines.StreamError.Protocol);
            BuildAndSend(this.client.Sender, destroy);
            return;
        }

        let sc = p.cell as StreamRelayCell;
        if(this.appMessagePrcessor) {
            var parsed : Buffer;
            parsed = this.appMessagePrcessor.receive(sc);

            if(this.onStreamResult)
                this.onStreamResult(parsed);

        } else {
            if(this.onRelayResult)
                this.onRelayResult(sc);
        }
    }

    set OnStreamResult(onStreamResult : OnStreamResult) {
        this.onStreamResult = onStreamResult;
    }

    set OnRelayResult(onRelayResult : OnRelayResult) {
        this.onRelayResult = onRelayResult;
    }

    set AppMessageProcessor(processor : ApplicationMessageProcessor) {
        this.appMessagePrcessor = processor;
    }

    cleanup() {
        this.client.Dispatcher.removeHandlersById(this.moduleName);
    }
}