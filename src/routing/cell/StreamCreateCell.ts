import {CellFactory} from "../CellFactory";
import {Cell, NewVariableCell, CircID, DetailedCell} from "../Cell";
import * as defines from "../Identifiers";
import * as cmd from "../Command";
import * as caster from "../../utils/typeCaster";
import {PutUint32} from "../../utils/Binary";

export class StreamCreateCell extends DetailedCell implements CellFactory{
    public circID : CircID;
    public streamNamespace : number;
    public payLoaded : boolean;
    public cookie : Buffer;
    public streamSubCommannd : number;

    constructor(cirID : CircID, streamNamespace) {
        super(defines.Command.StreamCreated);
        this.streamNamespace = streamNamespace;
        this.circID = cirID;
    }

    createCell() : Cell {
        let l = 4;
        if(this.payLoaded)
            l = l + 4 + this.cookie.length;

        var c = NewVariableCell(this.circID, defines.Command.StreamCreate, caster.int16(l));
        var offset = cmd.PayloadOffset(defines.Command.StreamCreate);
        var data = c.getData();

        PutUint32(data, caster.int32(this.streamNamespace), offset);

        if(this.payLoaded) {
            PutUint32(data, caster.int32(this.streamSubCommannd), offset + 4);
            if(this.cookie) {
                this.cookie.copy(data, offset + 8);
            }
        }
        return c;
    }
}

// AuthBypassCell represents AUTH_BYPASS cell
export class StreamCreatedCell extends DetailedCell {
    constructor() {
        super(defines.Command.StreamCreated);
    }
}
