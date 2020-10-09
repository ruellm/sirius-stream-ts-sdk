// Note test this in windows for endianess
// current code might be in Big Endian as it is ported from Mac vesion of code
// binary.go has both version on it
//TODO: detect endianness
import * as caster from "../utils/typeCaster"
import {byte} from "../utils/typeCaster";

export function PutUint64(b : Buffer, v : bigint, startIndex : number = 0) {
    var _ = b[7] // early bounds check to guarantee safety of writes below
    b[startIndex] = byte(Number(v >> 56n));
    b[startIndex+1] = byte(Number(v >> 48n));
    b[startIndex+2] = byte(Number(v >> 40n));
    b[startIndex+3] = byte(Number(v >> 32n));
    b[startIndex+4] = byte(Number(v >> 24n));
    b[startIndex+5] = byte(Number(v >> 16n));
    b[startIndex+6] = byte(Number(v >> 8n));
    b[startIndex+7] = byte(Number(v));
}

export function PutUint32(b : Buffer, v : number, startIndex : number = 0) {
    var _ = b[3]; // early bounds check to guarantee safety of writes below
    b[startIndex] = (v >> 24) & 0xff;
    b[startIndex + 1] = (v >> 16) & 0xff;
    b[startIndex + 2] = (v >> 8) & 0xff;
    b[startIndex + 3] = (v) & 0xff;
}

export function PutUint16(b : Buffer, v : number, startIndex : number = 0) {
    var _ = b[1]; // early bounds check to guarantee safety of writes below
    b[startIndex] = (v >> 8) & 0xFF;
    b[startIndex + 1] = (v) & 0xFF;
}

export function Uint16(b : Buffer, startIndex : number = 0) : number {
    let temp = b[startIndex + 1];        // bounds check hint to compiler;
    return caster.uint16(b[startIndex + 1] & 0xFFFF)  | caster.uint16(b[startIndex] & 0xFFFF)<< 8;
}

export function Uint32(b : Buffer, startIndex : number = 0) : number {
    let temp = b[startIndex + 3];        // bounds check hint to compiler;
    return caster.uint32(caster.uint32(b[startIndex+3]) | caster.uint32(b[startIndex+2])<<8 | caster.uint32(b[startIndex+1])<<16 | caster.uint32(b[startIndex])<<24);
}

export function Uint64(b : Buffer, startIndex : number = 0) : bigint {
    var _ = b[startIndex+7] // bounds check hint to compiler; see golang.org/issue/14808
    return BigInt(b[startIndex+7]) | BigInt(b[startIndex+6])<<8n | BigInt(b[startIndex+5])<<16n | BigInt(b[startIndex+4])<<24n |
        BigInt(b[startIndex+3])<<32n | BigInt(b[startIndex+2])<<40n | BigInt(b[startIndex+1])<<48n | BigInt(b[startIndex+0])<<56n;
}