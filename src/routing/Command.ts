// Command is a command.
export type Command = number

// IsVariableLength returns if cell is variable length or not.
export function IsVariableLength(c : Command) :boolean {
    return ((c & 0xFF) >= 128)
}

// PayloadOffset computes the payload offset from the start of cell data for the given command.
export function PayloadOffset(c : Command) : number {
    if (IsVariableLength(c)) {
        return 7;
    }
    return 5;
}

export function PayloadLength(c : Command, dataLen : number) : number {
    var offset = PayloadOffset(c);
    return dataLen - offset;
}