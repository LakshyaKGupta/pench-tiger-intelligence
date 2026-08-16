# Skill: Screenshot Capture

Use this skill when explicitly asked for a desktop or system screenshot (full screen, specific app/window, or region), or when target-specific browser-automation screenshot tools are unavailable.

## 1. Output Save Locations
- **Specific Path**: If the user provides a path, save there.
- **Default Location**: If no path is provided, save to the OS default screenshot directory.
- **Self-Inspection**: If needed for internal model verification, save to the temp directory.

## 2. Command Reference by Operating System

### macOS (Darwin)

#### Python Helper (Recommended)
```bash
python3 -c "import subprocess; subprocess.run(['screencapture', '-x', 'output/screen.png'])"
```

#### Direct CLI Fallbacks
- **Full Screen**: `screencapture -x output/screen.png`
- **Region (x,y,w,h)**: `screencapture -x -R100,200,800,600 output/region.png`
- **Specific Window ID**: `screencapture -x -l12345 output/window.png`

### Linux (X11)
- **Full Screen (scrot)**: `scrot output/screen.png`
- **Full Screen (gnome-screenshot)**: `gnome-screenshot -f output/screen.png`
- **Region (scrot)**: `scrot -a 100,200,800,600 output/region.png`
- **Active Window**: `scrot -u output/window.png`

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}'); Start-Sleep -m 250; $img = [System.Windows.Forms.Clipboard]::GetImage(); $img.Save('output/screen.png')"
```

## 3. Error Handling
- **macOS Permissions**: Ensure "Screen Recording" permissions are granted in System Settings -> Privacy & Security.
- **Missing CLI tools on Linux**: Fall back dynamically to `scrot`, `gnome-screenshot`, or ImageMagick `import`. If all are missing, prompt the user for installation.
- **Sandbox Failures**: If commands fail due to Sandbox write restrictions on folders, request permission or use `/tmp/` paths.
