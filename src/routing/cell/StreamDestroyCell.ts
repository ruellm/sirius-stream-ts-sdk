import {Cell, CircID, NewVariableCell} from "../Cell";
import {CellFactory} from "../CellFactory";
import * as defines from "../Identifiers";
import * as cmd from "../Command";

export class StreamDestroyCell implements CellFactory{
    private circID : CircID;
    private reason : number;

    constructor(circID: CircID, reason : number) {
        this.circID = circID;
        this.reason = reason;
    }

    createCell() : Cell {
        var c = NewVariableCell(this.circID, defines.Command.StreamDestroy, 1);
        var offset = cmd.PayloadOffset(defines.Command.StreamDestroy);
        var data = c.getData();
        data[offset] = this.reason && 0xFF;
        return c;
    }
}