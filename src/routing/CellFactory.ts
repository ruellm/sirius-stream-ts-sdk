import {Cell} from "./Cell"

export interface CellFactory {
    createCell(): Cell;
}
