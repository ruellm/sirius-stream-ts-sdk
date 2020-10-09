import {Log} from "../utils/Logger";
import {Uint32} from "../utils/Binary";
import * as c from "crypto";
import {HSHandshakeMac} from "../client/RvHandshake";
import {int32, uint32} from "../utils/typeCaster";
import {stringToAsciiByteArray} from "../utils/Hex";
import {HandshakeExpand, HandshakeKey} from "../defines/Onion";
import {circuitKeySize} from "../routing/circuit/CircuitCrypto";
import hkdf = require("futoin-hkdf");
import {isArraySame} from "../utils/CommonHelpers";
import * as forge from "node-forge";

export const hmacLen = 32;
export const ratchatLen =  hmacLen * 4;
export const ratchetProtoID = "psp-megolm-01";
export const ratchetExpand  = ratchetProtoID + ":key_expand";

export class Ratchet {
    public Counter : number;
    public Data : Buffer;

    key(size : number) : Buffer {
        var info = stringToAsciiByteArray(ratchetExpand);
        var d = hkdf(this.Data, size,
            {info: Buffer.from(info),hash: "SHA-256"});
        return d;
    }

    // decrypts and verifies the input against the sequenceID
    decrypt(sequenceID : number, hmac : Buffer, data : Buffer) : Buffer {
        if(data.length < 1) {
            Log("unable to decrypt ratchet data, is too short");
            return null;
        }

        if(hmac.length != 8) {
            Log("hmac size is invalid");
            return null;
        }

        this.avanceTo(sequenceID);

        let key = this.key(64);
        let hmacNew = this.hmacSHA256(data, key.slice(32));
        if(!isArraySame(hmac, hmacNew.slice(0, 8))) {
            Log("invalid hmac");
            return null;
        }

        //TODO: make common class for AES encrption
        const ckey = new forge.util.ByteStringBuffer(key.slice(0,16));
        let cipher = forge.cipher.createCipher('AES-CTR', ckey);
        let iv = key.slice(16, 32);
        const ivb = new forge.util.ByteStringBuffer(iv);
        cipher.start({iv: ivb});

        const inputBuffer = new forge.util.ByteStringBuffer(data);
        cipher.update(inputBuffer);
        cipher.finish();
        let result = Buffer.from(stringToAsciiByteArray(cipher.output.getBytes()))
        return result;
    }

    rehashPart (rehashFromPart : number, rehashToPart : number) {
        let data = this.Data.slice(rehashFromPart*hmacLen, (rehashFromPart*hmacLen)+hmacLen);
        let src = megolmHMAC(data, rehashToPart);
        src.copy(this.Data, rehashToPart*hmacLen);
    }

    advance() {
        let mask = uint32(0x00FFFFFF);
        let h = 0;

        this.Counter++;

        while(h < 4) {
            if((this.Counter & mask) == 0)
                break;

            h++;
            mask >>= 8;
        }

        for(let i=3; i >= h; i--) {
            this.rehashPart(h, i);
        }
    }
    avanceTo(to : number) {
        if( (to - this.Counter) == 1) {
            this.advance();
            return;
        }

        for(let j = 0; j < 4; j++) {
            let shift = uint32((4 - j - 1) * 8);
            let mask = uint32(uint32(~0) << shift);

            let steps = ((to >> shift) - (this.Counter >> shift)) & 0xff;

            if(steps == 0) {
                if(to < this.Counter)
                    steps = 0x100;
                else
                    continue;
            }

            while(steps > 1) {
                this.rehashPart(j, j)
                steps--;
            }

            for(let k=3; k >= j; k--) {
                this.rehashPart(j, k);
            }

            this.Counter = to & mask;
        }
    }

    hmacSHA256(x, k : Buffer) : Buffer {
        let hash = c.createHmac('sha256', Buffer.from(k)).update(x).digest();
        return Buffer.from(hash);
    }
}
export function megolmHMAC(x : Buffer, seed : number) : Buffer {
    const hmacKeySeeds = [
        [0x00],
        [0x01],
        [0x02],
        [0x03]
    ];

    let key = Buffer.from(hmacKeySeeds[seed]);
    let hash = c.createHmac('sha256', key ).update(x).digest();
    return Buffer.from(hash);
}

export function initializeRatchet(data : Buffer) : Ratchet {
    if(data.length != ratchatLen +4) {
        Log("Invalid input data during creation of ratchet");
        return null;
    }
    let megolm = new Ratchet();
    megolm.Counter = Uint32(data);
    megolm.Data = data.slice(4);

    return megolm;
}