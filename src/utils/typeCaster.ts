
export function int32(input : number) {
    return input & 0xFFFFFFFF;
}

export function int16(input : number) {
    return input & 0xFFFF;
}

export function int8(input : number) {
    return input & 0xFF;
}

export function byte(input) {
    return (input);
}