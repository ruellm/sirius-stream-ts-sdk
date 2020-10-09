
export function int32(input : number) {
    return input & 0xFFFFFFFF;
}

export function uint32(input : number) {
  return (new Uint32Array([input]))[0];
}

export function int16(input : number) {
    return input & 0xFFFF;
}

export function uint16(input : number) {
    return (new Uint16Array([input]))[0];
}

export function int8(input : number) {
    return input & 0xFF;
}

export function byte(input) {
    return (input);
}
