<?php
/**
 * Plugin bootstrap and hooks.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once FORGE_ADMIN_SUITE_PLUGIN_PATH . 'includes/admin-page.php';
require_once FORGE_ADMIN_SUITE_PLUGIN_PATH . 'includes/assets.php';
require_once FORGE_ADMIN_SUITE_PLUGIN_PATH . 'includes/rest.php';

/**
 * Main plugin controller.
 */
final class Forge_Admin_Suite_Plugin {
	/**
	 * Assets handler.
	 *
	 * @var Forge_Admin_Suite_Assets
	 */
	private $assets;

	/**
	 * REST handler.
	 *
	 * @var Forge_Admin_Suite_Rest
	 */
	private $rest;

	/**
	 * Admin page handler.
	 *
	 * @var Forge_Admin_Suite_Admin_Page
	 */
	private $admin_page;

	/**
	 * Admin page hook suffix.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	/**
	 * Initialize plugin.
	 *
	 * @return void
	 */
	public static function init() {
		$plugin = new self();
		$plugin->register();
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	private function register() {
		$this->assets     = new Forge_Admin_Suite_Assets();
		$this->rest       = new Forge_Admin_Suite_Rest();
		$this->admin_page = new Forge_Admin_Suite_Admin_Page();

		add_action( 'admin_menu', array( $this, 'register_menu' ) );

		$this->assets->register();
		$this->rest->register();
	}

	/**
	 * Register admin menu.
	 *
	 * @return void
	 */
	public function register_menu() {
		$this->hook_suffix = add_menu_page(
			__( 'Универсальная Админ Панель', 'forge-admin-suite' ),
			__( 'FAS', 'forge-admin-suite' ),
			'manage_options',
			'forge-admin-suite',
			array( $this->admin_page, 'render' ),
			'dashicons-admin-generic'
		);

		$this->assets->set_hook_suffix( $this->hook_suffix );
		add_action( 'load-' . $this->hook_suffix, array( $this, 'register_footer_filters' ) );
	}

	/**
	 * Register footer filters for the plugin admin screen.
	 *
	 * @return void
	 */
	public function register_footer_filters() {
		add_filter( 'admin_footer_text', array( $this, 'filter_admin_footer_text' ) );
		add_filter( 'update_footer', array( $this, 'filter_update_footer_text' ), 11 );
	}

	/**
	 * Filter the admin footer text for the plugin screen.
	 *
	 * @return string
	 */
	public function filter_admin_footer_text() {
		return '';
	}

	/**
	 * Filter the update footer text for the plugin screen.
	 *
	 * @return string
	 */
	public function filter_update_footer_text() {
		return '';
	}
}
