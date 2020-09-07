import {CircID, DetailedCell} from "../Cell";
import * as defines from "../Identifiers";

export class CreatedCell extends DetailedCell{
    public circId : CircID;
    public handshakeData : Buffer;

    constructor(circId : CircID, data : Buffer){
        super(defines.Command.Created);

        this.circId = circId;
        this.handshakeData = data;
    }
}