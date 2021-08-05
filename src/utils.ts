export function addressEquals(address1: string, address2: string): boolean {
    return address1.toLowerCase() === address2.toLowerCase();
}

export function containsAddress(addresses: string[], test: string): boolean {
    for (const address of addresses) {
        if (addressEquals(address, test)) {
            return true;
        }
    }

    return false;
}
