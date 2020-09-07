import {CircID, DetailedCell} from "../Cell";
import * as caster from "../../utils/typeCaster";
import * as defines from "../Identifiers";
import {RelayCell} from "./RelayCell";
import {Log} from "../../utils/Logger";

export class StreamRelayCell extends RelayCell {
    private circID : CircID;

    constructor(circID : CircID, payload : Buffer) {
        super(payload, defines.Command.StreamRelay);
        this.circID = circID;
    }

    isVariableLen() : boolean {
        return true;
    }

    relayData() {
        return this.getData();
    }
}

export function inPlaceStreamRelayCell(place : Buffer, length : number) {
    if(place.length != caster.int32(length)) {
        console.log("not enough space for the stream cell");
        return null;
    }

    return place;
}