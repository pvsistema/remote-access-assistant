using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PvsDost;

// Main window with a custom (borderless) frame:
//  - draggable title area (from the web UI via the JS bridge)
//  - minimize / maximize-restore / close buttons
//  - resizable from all edges/corners (WM_NCHITTEST)
//  - Aero Snap + double-click-to-maximize preserved
// The whole UI (including the title bar) is the packed web bundle.
public sealed class MainForm : Form
{
    private const string AppName = "ПВ-Система Доступ";
    private const string VirtualHost = "app.pvsdost.local";

    // resize border thickness (px) and window commands
    private const int ResizeBorder = 7;
    private const int WM_NCHITTEST = 0x0084;
    private const int WM_NCCALCSIZE = 0x0083;
    private const int WM_GETMINMAXINFO = 0x0024;

    private const int HTCLIENT = 1, HTLEFT = 10, HTRIGHT = 11, HTTOP = 12,
        HTTOPLEFT = 13, HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;

    private readonly WebView2 _web = new();

    public MainForm()
    {
        Text = AppName;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1280, 820);
        MinimumSize = new Size(940, 620);
        BackColor = Color.FromArgb(21, 101, 192);
        DoubleBuffered = true;

        var icoPath = Path.Combine(AppContext.BaseDirectory, "pvsdost.ico");
        if (File.Exists(icoPath))
        {
            try { Icon = new Icon(icoPath); } catch { /* keep default */ }
        }

        _web.Dock = DockStyle.Fill;
        Controls.Add(_web);

        Load += async (_, _) => await InitWebViewAsync();
        FormClosing += (_, _) => { _agent?.Dispose(); _agent = null; };
    }

    // Keep the maximized window inside the working area (so the taskbar stays visible).
    protected override void WndProc(ref Message m)
    {
        switch (m.Msg)
        {
            case WM_NCCALCSIZE when m.WParam != IntPtr.Zero:
                // Remove the default non-client border for the borderless frame.
                return;

            case WM_GETMINMAXINFO:
                AdjustMaxSize(m.LParam);
                base.WndProc(ref m);
                return;

            case WM_NCHITTEST:
                base.WndProc(ref m);
                if ((int)m.Result == HTCLIENT) m.Result = (IntPtr)HitTest();
                return;
        }
        base.WndProc(ref m);
    }

    private int HitTest()
    {
        var p = PointToClient(Cursor.Position);
        bool left = p.X <= ResizeBorder, right = p.X >= ClientSize.Width - ResizeBorder;
        bool top = p.Y <= ResizeBorder, bottom = p.Y >= ClientSize.Height - ResizeBorder;

        if (WindowState == FormWindowState.Maximized) return HTCLIENT;
        if (top && left) return HTTOPLEFT;
        if (top && right) return HTTOPRIGHT;
        if (bottom && left) return HTBOTTOMLEFT;
        if (bottom && right) return HTBOTTOMRIGHT;
        if (left) return HTLEFT;
        if (right) return HTRIGHT;
        if (top) return HTTOP;
        if (bottom) return HTBOTTOM;
        return HTCLIENT;
    }

    private void AdjustMaxSize(IntPtr lParam)
    {
        var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
        var scr = Screen.FromHandle(Handle);
        var wa = scr.WorkingArea;
        var b = scr.Bounds;
        mmi.ptMaxPosition.x = wa.Left - b.Left;
        mmi.ptMaxPosition.y = wa.Top - b.Top;
        mmi.ptMaxSize.x = wa.Width;
        mmi.ptMaxSize.y = wa.Height;
        mmi.ptMinTrackSize.x = MinimumSize.Width;
        mmi.ptMinTrackSize.y = MinimumSize.Height;
        Marshal.StructureToPtr(mmi, lParam, false);
    }

    private async Task InitWebViewAsync()
    {
        var dataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PVSDOST", "WebView2");
        Directory.CreateDirectory(dataDir);

        try
        {
            var env = await CoreWebView2Environment.CreateAsync(null, dataDir);
            await _web.EnsureCoreWebView2Async(env);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Не найден компонент Microsoft Edge WebView2 Runtime.\n\n" +
                "Установите его и запустите программу снова.\n\n" + ex.Message,
                AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        var core = _web.CoreWebView2;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false;

        var webRoot = Path.Combine(AppContext.BaseDirectory, "web");
        if (!Directory.Exists(webRoot) || !File.Exists(Path.Combine(webRoot, "index.html")))
        {
            MessageBox.Show(
                "Файлы интерфейса не найдены (папка \"web\").\nПереустановите программу.",
                AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        core.SetVirtualHostNameToFolderMapping(
            VirtualHost, webRoot, CoreWebView2HostResourceAccessKind.Allow);

        // Tell the web UI it runs inside the desktop host, so it shows its own
        // window title bar with the min/max/close controls.
        await core.AddScriptToExecuteOnDocumentCreatedAsync(
            "window.__PVSDOST__ = { desktop: true };");

        // JS -> C# bridge: window control commands from the web title bar.
        core.WebMessageReceived += (_, e) =>
        {
            string cmd;
            try { cmd = JsonDocument.Parse(e.WebMessageAsJson).RootElement.GetString() ?? ""; }
            catch { cmd = e.TryGetWebMessageAsString() ?? ""; }
            HandleWindowCommand(cmd);
        };

        core.NewWindowRequested += (_, e) => { e.Handled = true; OpenExternal(e.Uri); };
        core.NavigationStarting += (_, e) =>
        {
            if (e.Uri.StartsWith("http", StringComparison.OrdinalIgnoreCase) &&
                !e.Uri.Contains(VirtualHost, StringComparison.OrdinalIgnoreCase))
            {
                e.Cancel = true;
                OpenExternal(e.Uri);
            }
        };

        core.Navigate($"https://{VirtualHost}/index.html");
    }

    private RemoteAgent? _agent;

    private void HandleWindowCommand(string cmd)
    {
        if (InvokeRequired) { BeginInvoke(() => HandleWindowCommand(cmd)); return; }
        switch (cmd)
        {
            case "win:minimize":
                WindowState = FormWindowState.Minimized;
                break;
            case "win:maximize":
                WindowState = WindowState == FormWindowState.Maximized
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                break;
            case "win:close":
                Close();
                break;
            case "win:drag":
                // Start native window move so Aero Snap works.
                ReleaseCapture();
                SendMessage(Handle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
                break;
            default:
                HandleAgentCommand(cmd);
                break;
        }
    }

    // Remote-side control: the web UI starts/stops desktop sharing for a session.
    // Format: "agent:start:{sessionId}:{deviceUid}:{allowFiles}" | "agent:stop"
    private void HandleAgentCommand(string cmd)
    {
        if (cmd == "agent:stop")
        {
            _agent?.Dispose();
            _agent = null;
            return;
        }
        if (cmd.StartsWith("agent:start:", StringComparison.Ordinal))
        {
            var parts = cmd.Split(':');
            if (parts.Length < 4) return;
            if (!int.TryParse(parts[2], out int sessionId)) return;
            var deviceUid = parts[3];
            bool allowFiles = parts.Length < 5 || parts[4] != "0";

            _agent?.Dispose();
            _agent = new RemoteAgent(sessionId, deviceUid, allowFiles);
            _agent.Start();
        }
    }

    private static void OpenExternal(string uri)
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = uri,
                UseShellExecute = true,
            });
        }
        catch { /* ignore */ }
    }

    // --- native interop for window dragging ---
    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int HTCAPTION = 2;

    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }
}