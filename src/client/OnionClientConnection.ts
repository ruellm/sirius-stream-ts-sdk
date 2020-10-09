import * as net from "net";
import * as tls from "tls";
import * as hs from "../routing/Handshake";
import {CellSender} from "../routing/CellSender";
import {CellReceiver} from "../routing/CellReceiver";
import {NewFixedCell} from "../routing/Cell";
import * as defines from "../routing/Identifiers";
import {Log} from "../utils/Logger";

export class OnionClientConnection {
    private readonly tcpSocket: net.Socket;
    private cellSender : CellSender
    private cellReceiveer : CellReceiver;
    private fingerPrint : string;
    private onConnected : () => void;
    private moduleName : string;
    private alive : boolean;

    constructor() {
        this.tcpSocket = new net.Socket();
    }

    connect(host : string, port : number, fingerprint, onConnected) {
        var object = this;
        this.tcpSocket.connect( {port: port, host: host}, function (){
            Log("TCP connection established");
            object.handleNewConnection();
        });

        this.tcpSocket.on("error", (error)=>{
           Log(error);
        });

        this.fingerPrint = fingerprint;
        this.onConnected = onConnected;
        this.moduleName = "Connection://" +host+":"+port;
    }

    pinger() {
        var object = this;
        this.alive = true;

        let ping = setInterval(function () {
            if(object.alive)
                object.cellSender.send(NewFixedCell(0, defines.Command.Padding));
            else
                clearInterval(ping);

        }, 10 * 1000);
    }

    handleNewConnection(){
        var tlsConn = new tls.TLSSocket(this.tcpSocket, {});
        this.cellSender = new CellSender(tlsConn);
        this.cellReceiveer = new CellReceiver(tlsConn);
        this.alive = true;

        var context = this;
        var handshake = new hs.Handshake(tlsConn, this.cellSender, this.cellReceiveer, ()=>{
            if(handshake.getFingerPrint() != context.fingerPrint) {
                Log("Invalid fingerprint " +
                    "Fingerprint (Self): " + context.fingerPrint + " " +
                    "Fingerprint (Peer): " + handshake.getFingerPrint());
                return;
            }

            this.pinger();

            if(this.onConnected)
                this.onConnected();
        });

        handshake.connect();
    }

    get Dispatcher() {
       return this.Receiver.getDispatcher();
    }

    get Receiver() {
        return this.cellReceiveer;
    }
    get Sender() {
        return this.cellSender;
    }

    cleanup() {
        this.Receiver.getDispatcher().removeHandlersById(this.moduleName);
        this.alive = false;
    }
}