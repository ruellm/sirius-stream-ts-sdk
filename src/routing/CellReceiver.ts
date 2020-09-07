import {TLSSocket} from "tls";
import * as cell from "./Cell";
import {IsCommand, MaxPayloadLength} from "./Identifiers";
import {IsVariableLength} from "./Command";
import * as binary from "../utils/Binary";
import * as command from "./Command";
import {Cell} from "./Cell";
import {Dispatcher} from "./Dispatcher";
import {Log} from "../utils/Logger";
import {int16, int32} from "../utils/typeCaster";

export class CellReceiver {
    private tlsConn: TLSSocket;
    private dispatacher : Dispatcher;

    constructor(tlsCon : TLSSocket) {
        this.tlsConn = tlsCon;
        this.dispatacher = new Dispatcher();

        var object = this;
        this.tlsConn.on("data", function (data){
            object.handleData(data);
        });
    }

    parseCell(data : Buffer, startOffset : number) : { endOffset : number, cell : Cell} {

        // read cell header
        var cmdByte = data[startOffset+4];
        if(!IsCommand(cmdByte)) {
            Log("Unknown command");
            return {
                endOffset : -1,
                cell : null
            };
        }

        let cmd = cmdByte & 0xFF;

        // fixed vs. variable cell
        let payloadLen = int16(MaxPayloadLength);
        if (IsVariableLength(cmd))
            payloadLen = binary.Uint16(data, 5 + startOffset);

        const payloadOffset = command.PayloadOffset(cmd);
        const cellLength = payloadOffset + int32(payloadLen);

        var buffer = data.slice(startOffset, startOffset + cellLength);
        let c = cell.NewCellFromBuffer(buffer);

        return {
            endOffset : startOffset + cellLength,
            cell : c
        };
    }

    handleData(data) {
        let startOffset = 0;
        do {
            var result = this.parseCell(data, startOffset);
            if (result.cell == null)
                break;

            this.dispatacher.dispatch(result.cell);
            startOffset += result.endOffset;

        }while(result.endOffset < data.length);
    }

    getDispatcher() : Dispatcher {
        return this.dispatacher;
    }
}