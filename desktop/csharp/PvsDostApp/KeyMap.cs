using System.Collections.Generic;

namespace PvsDost;

// Maps browser KeyboardEvent.code / .key values to Windows virtual-key codes.
internal static class KeyMap
{
    private static readonly Dictionary<string, byte> ByCode = new()
    {
        ["Backspace"] = 0x08, ["Tab"] = 0x09, ["Enter"] = 0x0D, ["NumpadEnter"] = 0x0D,
        ["ShiftLeft"] = 0xA0, ["ShiftRight"] = 0xA1, ["ControlLeft"] = 0xA2, ["ControlRight"] = 0xA3,
        ["AltLeft"] = 0xA4, ["AltRight"] = 0xA5, ["Pause"] = 0x13, ["CapsLock"] = 0x14,
        ["Escape"] = 0x1B, ["Space"] = 0x20, ["PageUp"] = 0x21, ["PageDown"] = 0x22,
        ["End"] = 0x23, ["Home"] = 0x24, ["ArrowLeft"] = 0x25, ["ArrowUp"] = 0x26,
        ["ArrowRight"] = 0x27, ["ArrowDown"] = 0x28, ["PrintScreen"] = 0x2C, ["Insert"] = 0x2D,
        ["Delete"] = 0x2E, ["MetaLeft"] = 0x5B, ["MetaRight"] = 0x5C, ["ContextMenu"] = 0x5D,
        ["F1"] = 0x70, ["F2"] = 0x71, ["F3"] = 0x72, ["F4"] = 0x73, ["F5"] = 0x74,
        ["F6"] = 0x75, ["F7"] = 0x76, ["F8"] = 0x77, ["F9"] = 0x78, ["F10"] = 0x79,
        ["F11"] = 0x7A, ["F12"] = 0x7B, ["NumLock"] = 0x90, ["ScrollLock"] = 0x91,
        ["Semicolon"] = 0xBA, ["Equal"] = 0xBB, ["Comma"] = 0xBC, ["Minus"] = 0xBD,
        ["Period"] = 0xBE, ["Slash"] = 0xBF, ["Backquote"] = 0xC0, ["BracketLeft"] = 0xDB,
        ["Backslash"] = 0xDC, ["BracketRight"] = 0xDD, ["Quote"] = 0xDE,
        ["Numpad0"] = 0x60, ["Numpad1"] = 0x61, ["Numpad2"] = 0x62, ["Numpad3"] = 0x63,
        ["Numpad4"] = 0x64, ["Numpad5"] = 0x65, ["Numpad6"] = 0x66, ["Numpad7"] = 0x67,
        ["Numpad8"] = 0x68, ["Numpad9"] = 0x69, ["NumpadMultiply"] = 0x6A, ["NumpadAdd"] = 0x6B,
        ["NumpadSubtract"] = 0x6D, ["NumpadDecimal"] = 0x6E, ["NumpadDivide"] = 0x6F,
    };

    public static byte ToVirtualKey(string code, string key)
    {
        if (!string.IsNullOrEmpty(code))
        {
            // Letters: "KeyA".."KeyZ"
            if (code.Length == 4 && code.StartsWith("Key"))
                return (byte)char.ToUpperInvariant(code[3]);
            // Digits: "Digit0".."Digit9"
            if (code.Length == 6 && code.StartsWith("Digit"))
                return (byte)code[5];
            if (ByCode.TryGetValue(code, out var vk)) return vk;
        }

        if (!string.IsNullOrEmpty(key) && key.Length == 1)
        {
            char ch = key[0];
            if (ch is >= 'a' and <= 'z') return (byte)char.ToUpperInvariant(ch);
            if (ch is >= 'A' and <= 'Z') return (byte)ch;
            if (ch is >= '0' and <= '9') return (byte)ch;
        }

        return 0;
    }
}
