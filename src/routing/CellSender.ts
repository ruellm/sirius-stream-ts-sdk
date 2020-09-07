import {TLSSocket} from "tls";
import {Cell} from "./Cell";
import {Log} from "../utils/Logger";

export class CellSender {
    private tlsConn: TLSSocket;

    constructor(tlsCon : TLSSocket) {
        this.tlsConn = tlsCon;
    }

    send(cell : Cell) {
         this.tlsConn.write(cell.getData());
    }
}