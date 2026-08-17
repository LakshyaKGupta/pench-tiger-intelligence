use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct SidecarState {
    child: Mutex<Option<Child>>,
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "app_name": "TIGERTRACK AI",
        "version": "3.2.0",
        "mode": "OFFLINE_STANDALONE",
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

#[tauri::command]
fn open_data_folder() -> Result<String, String> {
    let app_dir = match std::env::consts::OS {
        "macos" => {
            let home = std::env::var("HOME").map_err(|e| e.to_string())?;
            format!("{}/Library/Application Support/TIGERTRACK AI", home)
        }
        "windows" => {
            let appdata = std::env::var("APPDATA").map_err(|e| e.to_string())?;
            format!("{}\\TIGERTRACK AI", appdata)
        }
        _ => {
            let home = std::env::var("HOME").map_err(|e| e.to_string())?;
            format!("{}/.local/share/TIGERTRACK AI", home)
        }
    };

    #[cfg(target_os = "macos")]
    let _ = Command::new("open").arg(&app_dir).spawn();

    #[cfg(target_os = "windows")]
    let _ = Command::new("explorer").arg(&app_dir).spawn();

    #[cfg(target_os = "linux")]
    let _ = Command::new("xdg-open").arg(&app_dir).spawn();

    Ok(app_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            open_data_folder
        ])
        .setup(|app| {
            println!("🐅 Initializing TIGERTRACK AI Native Desktop Shell...");
            
            // Check and spawn bundled Python sidecar if present
            use tauri_plugin_shell::ShellExt;
            match app.shell().sidecar("tiger-intelligence-sidecar") {
                Ok(command) => {
                    println!("🚀 Spawning local Python intelligence engine sidecar...");
                    match command.spawn() {
                        Ok((_rx, child)) => {
                            println!("✓ Sidecar process successfully spawned (PID: {})", child.pid());
                        }
                        Err(e) => {
                            println!("⚠️ Sidecar spawn notice (running standalone or dev bridge): {}", e);
                        }
                    }
                }
                Err(e) => {
                    println!("ℹ️ Sidecar command not packaged (development mode active): {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<SidecarState>() {
                    if let Ok(mut child_lock) = state.child.lock() {
                        if let Some(mut child) = child_lock.take() {
                            println!("🛑 Terminating local Python intelligence bridge sidecar...");
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running TIGERTRACK AI desktop application");
}
