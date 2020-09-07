import {NodePublicIdentity} from "../../../src/client/Discovery";
import {Circuit} from "../../../src/routing/circuit/Circuit";

describe('Circuit test', () => {
    it('cam create extend info', () => {
        let endpoint = new NodePublicIdentity();
        endpoint.OnionAddress = new Array<string>();
        endpoint.OnionAddress.push("5dbf2ed16692:7006");

        var fingerprint=[
            66 , 119 , 62 , 236 , 30 , 209 , 4 , 226 , 41 ,
            23 , 221 , 45 , 229 , 56 , 237 , 140 , 222 , 231 ,
            193 , 230 , 36 , 131 , 26 , 64 , 59 , 66 , 104 , 154 ,
            128 , 169 , 84 , 84];

        var handshake = [
            62, 231, 85, 232, 88, 199, 224, 119, 28, 93, 54, 234,
            0, 217, 64, 206, 81, 24, 4, 51, 21, 82, 41, 86, 29,
            186, 4, 104, 64, 77, 186, 99];

        endpoint.Fingerprint = Buffer.from(fingerprint);
        endpoint.HandshakeKey = Buffer.from(handshake);

        let circuit = new Circuit(100, null, null);
        circuit.extend(endpoint);
    })
});