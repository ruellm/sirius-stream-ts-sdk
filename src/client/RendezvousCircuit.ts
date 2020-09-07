import {Circuit} from "../routing/circuit/Circuit";
import {RvCircuitHandler} from "./RvCircuitHandler";
import * as identifiers from "../routing/Identifiers";
import {Cell, NewFixedCell} from "../routing/Cell";
import {newRelayCell, newRelayCellFromBytes, RelayCell} from "../routing/cell/RelayCell";
import {Log} from "../utils/Logger";
import * as defines from "../routing/Identifiers";
import {stringToAsciiByteArray} from "../utils/Hex";

export class RendezvousCircuit {
    private circuit : Circuit;
    private circuitHandler : RvCircuitHandler;
    private moduleName : string;

    constructor(circuit : Circuit, circuitHandler : RvCircuitHandler) {
        this.circuit = circuit;
        this.circuitHandler = circuitHandler;
        this.moduleName = "RendezvousCircuit" + circuit.CircuitId;

        var context = this;
        this.circuit.OnEncodedData = (payload : Buffer) => {
            context.onDataRecieved(payload);
        };
    }

    onDataRecieved(payload : Buffer) {
        if(this.circuit == null || this.circuitHandler == null)
            return;

        payload = this.circuitHandler.Recieve.decrypt(payload);
        let r = newRelayCellFromBytes(payload);
        if(r == null) {
            Log("[0] Unable to receive Encoded relayed cell");
            return;
        }

        if( r.recognized() != 0) {
            Log("[1] Unable to receive Encoded relayed cell");
            return;
        }

        let digest = this.circuitHandler.Recieve.digest();
        if( digest != r.getDigest()) {
            Log("[2] Unable to receive Encoded relayed cell");
            return;
        }

        let relayData = r.relayData();
        let message = String.fromCharCode.apply(String, relayData);
        Log("Data Received : " + message);

        // temporary, sending messaage
        this.sendMessage("Hello back");
    }

    sendMessage(msg : string) {
        if(this.circuit == null || this.circuitHandler == null)
            return;

        let reply = NewFixedCell(0, defines.Command.Relay);
        let message = stringToAsciiByteArray(msg);
        let extended = newRelayCell(0, Buffer.from(message));
        reply.setPayLoad(extended.getData());
        let payload = reply.payLoad();
        payload = this.circuitHandler.Send.encryptOrigin(payload);
        reply.setPayLoad(payload);

        if(!this.circuit.sendCellToRendezvousCircuit(reply)){
            Log("Unable to send cell towards the other side of RV circuit");
        }
    }

}