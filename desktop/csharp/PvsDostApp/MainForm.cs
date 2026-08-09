using System;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PvsDost;

// Main window: a maximized WebView2 that renders the packed web interface.
public sealed class MainForm : Form
{
    private const string AppName = "ПВ-Система Доступ";
    private const string VirtualHost = "app.pvsdost.local";

    private readonly WebView2 _web = new();

    public MainForm()
    {
        Text = AppName;
        Width = 1280;
        Height = 800;
        MinimumSize = new Size(900, 600);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;

        var icoPath = Path.Combine(AppContext.BaseDirectory, "pvsdost.ico");
        if (File.Exists(icoPath))
        {
            try { Icon = new Icon(icoPath); } catch { /* keep default */ }
        }

        _web.Dock = DockStyle.Fill;
        Controls.Add(_web);

        Load += async (_, _) => await InitWebViewAsync();
    }

    private async Task InitWebViewAsync()
    {
        // Keep user data (cache, cookies, saved login) in %LOCALAPPDATA%.
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

        // Hide dev features in the release host.
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false;

        // Map the packed web folder to a virtual https host so relative
        // paths and history routing work like a real site.
        var webRoot = Path.Combine(AppContext.BaseDirectory, "web");
        if (!Directory.Exists(webRoot) || !File.Exists(Path.Combine(webRoot, "index.html")))
        {
            MessageBox.Show(
                "Файлы интерфейса не найдены (папка \"web\").\n" +
                "Переустановите программу.",
                AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        core.SetVirtualHostNameToFolderMapping(
            VirtualHost, webRoot, CoreWebView2HostResourceAccessKind.Allow);

        // Open external links (http/https to other hosts) in the system browser.
        core.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            OpenExternal(e.Uri);
        };
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
}
