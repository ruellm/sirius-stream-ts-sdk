import {CircuitCryptoState, CircuitKeys} from "./CircuitCrypto";

export class OnionHop {
    public circuitKeys : CircuitKeys;
    public fwState : CircuitCryptoState;
    public backState : CircuitCryptoState;

    constructor() {
    }
}