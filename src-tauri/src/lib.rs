use tauri::Manager;

mod state;
mod db;
mod commands;
mod http;
mod websocket;
mod scripting;
mod import;
mod codegen;
mod sync_client;

use state::AppState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("reqlite=debug")
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&data_dir).ok();

            let db_path = data_dir.join("reqlite.db");
            let state = AppState::new(db_path.to_str().unwrap())
                .expect("Failed to initialize app state");

            app.manage(Arc::new(state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::collections::list_workspaces,
            commands::collections::create_workspace,
            commands::collections::list_collections,
            commands::collections::create_collection,
            commands::collections::update_collection,
            commands::collections::delete_collection,
            commands::collections::list_requests,
            commands::collections::get_request,
            commands::collections::create_request,
            commands::collections::update_request,
            commands::collections::delete_request,
            commands::http::send_request,
            commands::environments::list_environments,
            commands::environments::create_environment,
            commands::environments::update_environment,
            commands::environments::delete_environment,
            commands::environments::get_active_environment,
            commands::environments::set_active_environment,
            commands::history::list_history,
            commands::history::clear_history,
            commands::import::import_curl,
            commands::import::import_openapi,
            commands::codegen::generate_code,
            commands::scripting::run_script,
            commands::websocket::ws_connect,
            commands::websocket::ws_send,
            commands::websocket::ws_disconnect,
            commands::sync::connect_sync,
            commands::sync::disconnect_sync,
            commands::sync::get_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
