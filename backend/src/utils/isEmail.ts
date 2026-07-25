import z from "zod";

export function isEmail(identifier: string): { value: string, type: string } {
    return z.string().email().safeParse(identifier.trim()).success ? ({ value: identifier.toLowerCase(), type: "email" })
        : ({ value: identifier.trim(), type: "username" });
}
