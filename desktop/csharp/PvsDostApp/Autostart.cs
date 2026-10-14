using System;
using Microsoft.Win32;

namespace PvsDost;

// Windows autostart for the current user (HKCU\...\Run). No admin rights needed.
// The program then starts hidden in the tray and stays reachable remotely.
internal static class Autostart
{
    public const string Arg = "--autostart";
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "PVSDOST";

    private static string Command => $"\"{Environment.ProcessPath}\" {Arg}";

    public static bool IsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, false);
            return key?.GetValue(ValueName) is string v && v.Length > 0;
        }
        catch { return false; }
    }

    public static void Set(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, true)
                            ?? Registry.CurrentUser.CreateSubKey(RunKey, true);
            if (enabled) key.SetValue(ValueName, Command);
            else if (key.GetValue(ValueName) != null) key.DeleteValue(ValueName, false);
        }
        catch { /* no access to registry — ignore */ }
    }

    // If the program was moved/updated, point the entry at the current exe.
    public static void Refresh()
    {
        if (IsEnabled()) Set(true);
    }
}
