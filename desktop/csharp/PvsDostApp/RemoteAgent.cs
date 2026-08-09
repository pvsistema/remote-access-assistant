using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace PvsDost;

// Runs on the REMOTE (controlled) PC during an active session.
// Captures the desktop, uploads JPEG frames, and applies incoming operator
// input (mouse, keyboard, hotkeys), clipboard and file transfers.
// Authenticates to the stream API by the device UID (no operator token).
public sealed class RemoteAgent : IDisposable
{
    private const string StreamUrl = "https://functions.poehali.dev/db97b202-938b-4e3c-bee5-4e64927b6717";

    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private readonly int _sessionId;
    private readonly bool _allowFiles;
    private CancellationTokenSource? _cts;

    private int _monitor = 1;
    private long _clipSeq = -1;
    private string _lastClipboard = "";

    public RemoteAgent(int sessionId, string deviceUid, bool allowFiles = true)
    {
        _sessionId = sessionId;
        _allowFiles = allowFiles;
        _http.DefaultRequestHeaders.Add("X-Device-Uid", deviceUid);
    }

    public void Start()
    {
        _cts = new CancellationTokenSource();
        _ = Task.Run(() => CaptureLoopAsync(_cts.Token));
        _ = Task.Run(() => CommandLoopAsync(_cts.Token));
        _ = Task.Run(() => ClipboardLoopAsync(_cts.Token));
    }

    public void Stop() => _cts?.Cancel();

    public void Dispose()
    {
        Stop();
        _http.Dispose();
        _cts?.Dispose();
    }

    // ---------- HTTP helpers ----------

    private async Task PostAsync(string action, object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var resp = await _http.PostAsync($"{StreamUrl}?action={action}", content, ct);
        resp.Dispose();
    }

    // ---------- screen capture ----------

    private async Task CaptureLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var jpeg = CaptureScreen(out int w, out int h);
                await PostAsync("push_frame", new
                {
                    session_id = _sessionId,
                    monitor = _monitor,
                    width = w,
                    height = h,
                    image_b64 = Convert.ToBase64String(jpeg),
                }, ct);
            }
            catch { /* keep streaming on next tick */ }

            try { await Task.Delay(280, ct); } catch { break; }
        }
    }

    private byte[] CaptureScreen(out int width, out int height)
    {
        var screens = Screen.AllScreens;
        var screen = _monitor > 0 && screens.Length >= _monitor ? screens[_monitor - 1] : Screen.PrimaryScreen!;
        var b = screen.Bounds;

        using var bmp = new Bitmap(b.Width, b.Height, PixelFormat.Format24bppRgb);
        using (var g = Graphics.FromImage(bmp))
        {
            g.CopyFromScreen(b.Left, b.Top, 0, 0, b.Size, CopyPixelOperation.SourceCopy);
            DrawCursor(g, b);
        }

        const int maxW = 1366;
        Bitmap send = bmp;
        if (bmp.Width > maxW)
        {
            int nh = (int)(bmp.Height * (maxW / (double)bmp.Width));
            send = new Bitmap(bmp, new Size(maxW, nh));
        }

        width = send.Width;
        height = send.Height;

        var codec = GetJpegCodec();
        using var ep = new EncoderParameters(1);
        ep.Param[0] = new EncoderParameter(Encoder.Quality, 55L);
        using var ms = new MemoryStream();
        send.Save(ms, codec, ep);
        if (!ReferenceEquals(send, bmp)) send.Dispose();
        return ms.ToArray();
    }

    private static void DrawCursor(Graphics g, Rectangle bounds)
    {
        try
        {
            var ci = new CURSORINFO { cbSize = Marshal.SizeOf<CURSORINFO>() };
            if (GetCursorInfo(ref ci) && ci.flags == CURSOR_SHOWING)
            {
                IntPtr hdc = g.GetHdc();
                DrawIcon(hdc, ci.ptScreenPos.x - bounds.Left, ci.ptScreenPos.y - bounds.Top, ci.hCursor);
                g.ReleaseHdc(hdc);
            }
        }
        catch { /* cursor overlay is optional */ }
    }

    private static ImageCodecInfo GetJpegCodec()
    {
        foreach (var c in ImageCodecInfo.GetImageEncoders())
            if (c.FormatID == ImageFormat.Jpeg.Guid) return c;
        return ImageCodecInfo.GetImageEncoders()[0];
    }

    // ---------- operator commands ----------

    private async Task CommandLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var url = $"{StreamUrl}?action=commands&session_id={_sessionId}";
                var text = await _http.GetStringAsync(url, ct);
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.TryGetProperty("commands", out var list))
                {
                    foreach (var c in list.EnumerateArray()) Apply(c);
                }
            }
            catch { /* retry on next tick */ }

            try { await Task.Delay(90, ct); } catch { break; }
        }
    }

    private void Apply(JsonElement c)
    {
        var kind = c.TryGetProperty("kind", out var k) ? k.GetString() ?? "" : "";
        var p = c.TryGetProperty("payload", out var pv) ? pv : default;

        switch (kind)
        {
            case "mouse": ApplyMouse(p); break;
            case "key": ApplyKey(p); break;
            case "hotkey": ApplyHotkey(p); break;
            case "clipboard":
                if (p.ValueKind == JsonValueKind.Object && p.TryGetProperty("text", out var t))
                {
                    var val = t.GetString() ?? "";
                    _lastClipboard = val;
                    RunOnUi(() => { try { Clipboard.SetText(val); } catch { } });
                }
                break;
            case "file":
                if (_allowFiles) _ = DownloadFileAsync(p);
                break;
        }
    }

    // Operator sends normalised coordinates (0..1) relative to the monitor.
    private void ApplyMouse(JsonElement p)
    {
        if (p.ValueKind != JsonValueKind.Object) return;
        var action = p.TryGetProperty("action", out var a) ? a.GetString() ?? "" : "";

        var screens = Screen.AllScreens;
        var screen = _monitor > 0 && screens.Length >= _monitor ? screens[_monitor - 1] : Screen.PrimaryScreen!;
        var b = screen.Bounds;

        if (p.TryGetProperty("x", out var xe) && p.TryGetProperty("y", out var ye))
        {
            int x = b.Left + (int)(xe.GetDouble() * b.Width);
            int y = b.Top + (int)(ye.GetDouble() * b.Height);
            SetCursorPos(x, y);
        }

        string button = p.TryGetProperty("button", out var be) ? be.GetString() ?? "left" : "left";
        uint down = button == "right" ? MOUSEEVENTF_RIGHTDOWN : button == "middle" ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN;
        uint up = button == "right" ? MOUSEEVENTF_RIGHTUP : button == "middle" ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP;

        switch (action)
        {
            case "down": mouse_event(down, 0, 0, 0, UIntPtr.Zero); break;
            case "up": mouse_event(up, 0, 0, 0, UIntPtr.Zero); break;
            case "wheel":
                int delta = p.TryGetProperty("delta", out var de) ? de.GetInt32() : 120;
                mouse_event(MOUSEEVENTF_WHEEL, 0, 0, delta, UIntPtr.Zero);
                break;
        }
    }

    private void ApplyKey(JsonElement p)
    {
        if (p.ValueKind != JsonValueKind.Object) return;
        var action = p.TryGetProperty("action", out var a) ? a.GetString() ?? "down" : "down";
        var code = p.TryGetProperty("code", out var ce) ? ce.GetString() ?? "" : "";
        var key = p.TryGetProperty("key", out var ke) ? ke.GetString() ?? "" : "";

        byte vk = KeyMap.ToVirtualKey(code, key);
        if (vk == 0) return;
        uint flags = action == "up" ? KEYEVENTF_KEYUP : 0;
        keybd_event(vk, 0, flags, UIntPtr.Zero);
    }

    private void ApplyHotkey(JsonElement p)
    {
        if (p.ValueKind != JsonValueKind.Object) return;
        var combo = p.TryGetProperty("combo", out var ce) ? ce.GetString() ?? "" : "";
        if (combo == "ctrl+alt+del")
        {
            // Real SAS can't be injected from user mode; emulate the closest safe action.
            keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
            keybd_event((byte)'L', 0, 0, UIntPtr.Zero);
            keybd_event((byte)'L', 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
    }

    // ---------- clipboard sync (remote -> operator) ----------

    private async Task ClipboardLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                string current = "";
                RunOnUi(() => { try { if (Clipboard.ContainsText()) current = Clipboard.GetText(); } catch { } });
                if (!string.IsNullOrEmpty(current) && current != _lastClipboard)
                {
                    _lastClipboard = current;
                    await PostAsync("set_clipboard", new { session_id = _sessionId, text = current, side = "client" }, ct);
                }
            }
            catch { /* ignore */ }

            try { await Task.Delay(1500, ct); } catch { break; }
        }
    }

    // ---------- files (operator -> remote) ----------

    private async Task DownloadFileAsync(JsonElement p)
    {
        try
        {
            if (p.ValueKind != JsonValueKind.Object) return;
            var url = p.TryGetProperty("url", out var ue) ? ue.GetString() ?? "" : "";
            var name = p.TryGetProperty("name", out var ne) ? ne.GetString() ?? "file" : "file";
            var id = p.TryGetProperty("id", out var ie) ? ie.GetInt32() : 0;
            if (url.Length == 0) return;

            var data = await _http.GetByteArrayAsync(url);
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads", "ПВ-Доступ");
            Directory.CreateDirectory(dir);
            var safe = string.Join("_", name.Split(Path.GetInvalidFileNameChars()));
            File.WriteAllBytes(Path.Combine(dir, safe), data);

            if (id > 0)
                await PostAsync("file_delivered", new { session_id = _sessionId, transfer_id = id }, CancellationToken.None);
        }
        catch { /* ignore failed transfer */ }
    }

    private static void RunOnUi(Action action)
    {
        var ctx = Application.OpenForms.Count > 0 ? Application.OpenForms[0] : null;
        if (ctx is { IsHandleCreated: true }) ctx.Invoke(action);
        else action();
    }

    // ---------- native interop ----------

    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002, MOUSEEVENTF_LEFTUP = 0x0004;
    private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008, MOUSEEVENTF_RIGHTUP = 0x0010;
    private const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020, MOUSEEVENTF_MIDDLEUP = 0x0040;
    private const uint MOUSEEVENTF_WHEEL = 0x0800;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const byte VK_LWIN = 0x5B;
    private const int CURSOR_SHOWING = 0x0001;

    [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] private static extern void mouse_event(uint flags, int dx, int dy, int data, UIntPtr extra);
    [DllImport("user32.dll")] private static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("user32.dll")] private static extern bool GetCursorInfo(ref CURSORINFO pci);
    [DllImport("user32.dll")] private static extern bool DrawIcon(IntPtr hdc, int x, int y, IntPtr hIcon);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct CURSORINFO
    {
        public int cbSize;
        public int flags;
        public IntPtr hCursor;
        public POINT ptScreenPos;
    }
}
