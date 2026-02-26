<?php
/**
 * Plugin Name: Универсальная Админ Панель
 * Description: React-powered admin panel scaffold with Vite and a REST status endpoint.
 * Version: 0.1.15
 * Author: Forge
 * Text Domain: forge-admin-suite
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FORGE_ADMIN_SUITE_VERSION', '0.1.15' );
define( 'FORGE_ADMIN_SUITE_PLUGIN_FILE', __FILE__ );
define( 'FORGE_ADMIN_SUITE_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'FORGE_ADMIN_SUITE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'FORGE_ADMIN_SUITE_VITE_ORIGIN_TRANSIENT', 'forge_admin_suite_vite_origin' );

require_once FORGE_ADMIN_SUITE_PLUGIN_PATH . 'includes/plugin.php';

Forge_Admin_Suite_Plugin::init();
