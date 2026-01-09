<?php
/**
 * Asset loading and Vite integration.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles admin assets and Vite detection.
 */
final class Forge_Admin_Suite_Assets {
	/**
	 * Hook suffix for the admin page.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	/**
	 * Module script handles.
	 *
	 * @var string[]
	 */
	private $module_handles = array();

	/**
	 * Admin notice message.
	 *
	 * @var string
	 */
	private $notice_message = '';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_notices', array( $this, 'render_admin_notice' ) );
		add_filter( 'script_loader_tag', array( $this, 'filter_script_loader_tag' ), 10, 3 );
	}

	/**
	 * Set admin page hook suffix.
	 *
	 * @param string $hook_suffix Admin page hook suffix.
	 * @return void
	 */
	public function set_hook_suffix( $hook_suffix ) {
		$this->hook_suffix = (string) $hook_suffix;
	}

	/**
	 * Enqueue assets for admin page.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_assets( $hook_suffix ) {
		if ( ! $this->is_plugin_page( $hook_suffix ) ) {
			return;
		}

		$origin = $this->detect_vite_origin();
		if ( $origin ) {
			$this->enqueue_dev_assets( $origin );
			return;
		}

		$manifest = $this->load_manifest();
		if ( $manifest ) {
			$this->enqueue_prod_assets( $manifest );
			return;
		}

		$this->notice_message = __( 'Forge Admin Suite assets not found. Start the Vite dev server or run pnpm -C dev/ui build.', 'forge-admin-suite' );
	}

	/**
	 * Render admin notice when assets are missing.
	 *
	 * @return void
	 */
	public function render_admin_notice() {
		if ( empty( $this->notice_message ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || $screen->id !== $this->hook_suffix ) {
			return;
		}
		?>
		<div class="notice notice-warning">
			<p><?php echo esc_html( $this->notice_message ); ?></p>
		</div>
		<?php
	}

	/**
	 * Add type="module" to module scripts.
	 *
	 * @param string $tag Script tag.
	 * @param string $handle Script handle.
	 * @param string $src Script src.
	 * @return string
	 */
	public function filter_script_loader_tag( $tag, $handle, $src ) {
		if ( ! in_array( $handle, $this->module_handles, true ) ) {
			return $tag;
		}

		if ( false !== strpos( $tag, ' type=' ) ) {
			return $tag;
		}

		return str_replace( '<script ', '<script type="module" ', $tag );
	}

	/**
	 * Determine if current admin page is plugin page.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return bool
	 */
	private function is_plugin_page( $hook_suffix ) {
		return $this->hook_suffix && $hook_suffix === $this->hook_suffix;
	}

	/**
	 * Detect Vite dev server origin and cache it.
	 *
	 * @return string
	 */
	private function detect_vite_origin() {
		$should_recheck = $this->should_recheck_origin();
		$cached_origin  = get_transient( FORGE_ADMIN_SUITE_VITE_ORIGIN_TRANSIENT );

		if ( ! $should_recheck && is_string( $cached_origin ) && $cached_origin ) {
			if ( $this->probe_vite_origin( $cached_origin ) ) {
				return $cached_origin;
			}

			delete_transient( FORGE_ADMIN_SUITE_VITE_ORIGIN_TRANSIENT );
			return '';
		}

		$origins = array_filter(
			array(
				is_string( $cached_origin ) && $cached_origin ? $cached_origin : null,
				'http://127.0.0.1:5173',
				'http://localhost:5173',
			)
		);
		$origins = array_values( array_unique( $origins ) );

		foreach ( $origins as $origin ) {
			if ( $this->probe_vite_origin( $origin ) ) {
				set_transient( FORGE_ADMIN_SUITE_VITE_ORIGIN_TRANSIENT, $origin, DAY_IN_SECONDS );
				return $origin;
			}
		}

		delete_transient( FORGE_ADMIN_SUITE_VITE_ORIGIN_TRANSIENT );

		return '';
	}

	/**
	 * Check if Vite origin should be rechecked.
	 *
	 * @return bool
	 */
	private function should_recheck_origin() {
		if ( ! isset( $_GET['forge_recheck_vite'] ) ) {
			return false;
		}

		$recheck = sanitize_text_field( wp_unslash( $_GET['forge_recheck_vite'] ) );

		return '' !== $recheck;
	}

	/**
	 * Probe a Vite dev server origin.
	 *
	 * @param string $origin Vite origin.
	 * @return bool
	 */
	private function probe_vite_origin( $origin ) {
		$url      = trailingslashit( $origin ) . '@vite/client';
		$response = wp_remote_get(
			$url,
			array(
				'timeout'     => 0.3,
				'redirection' => 0,
				'sslverify'   => false,
				'user-agent'  => 'ForgeAdminSuite/' . FORGE_ADMIN_SUITE_VERSION . '; ' . home_url(),
			)
		);

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$status = wp_remote_retrieve_response_code( $response );
		return $status >= 200 && $status < 300;
	}

	/**
	 * Load Vite manifest JSON.
	 *
	 * @return array|null
	 */
	private function load_manifest() {
		$manifest_path = FORGE_ADMIN_SUITE_PLUGIN_PATH . 'ui/dist/.vite/manifest.json';

		if ( ! file_exists( $manifest_path ) ) {
			return null;
		}

		$raw_manifest = file_get_contents( $manifest_path );
		if ( ! $raw_manifest ) {
			return null;
		}

		$manifest = json_decode( $raw_manifest, true );
		if ( ! is_array( $manifest ) ) {
			return null;
		}

		return $manifest;
	}

	/**
	 * Enqueue assets from Vite dev server.
	 *
	 * @param string $origin Vite origin.
	 * @return void
	 */
	private function enqueue_dev_assets( $origin ) {
		$origin = untrailingslashit( $origin );

		$vite_handle     = 'forge-admin-suite-vite-client';
		$preamble_handle = 'forge-admin-suite-vite-preamble';
		$app_handle      = 'forge-admin-suite-app';

		wp_enqueue_script( $vite_handle, $origin . '/@vite/client', array(), null, true );
		wp_enqueue_script( $preamble_handle, $origin . '/src/wpVitePreamble.ts', array( $vite_handle ), null, true );
		wp_enqueue_script( $app_handle, $origin . '/src/main.tsx', array( $preamble_handle ), null, true );

		$this->module_handles = array( $vite_handle, $preamble_handle, $app_handle );

		wp_add_inline_script( $app_handle, $this->get_inline_config(), 'before' );
	}

	/**
	 * Enqueue assets from production build.
	 *
	 * @param array $manifest Vite manifest.
	 * @return void
	 */
	private function enqueue_prod_assets( array $manifest ) {
		if ( empty( $manifest['src/main.tsx'] ) || ! is_array( $manifest['src/main.tsx'] ) ) {
			$this->notice_message = __( 'Forge Admin Suite manifest is missing src/main.tsx entry.', 'forge-admin-suite' );
			return;
		}

		$asset_base = FORGE_ADMIN_SUITE_PLUGIN_URL . 'ui/dist/';

		$handles = array();
		$this->enqueue_manifest_entry( $manifest, 'src/main.tsx', $asset_base, $handles );

		if ( empty( $handles ) ) {
			$this->notice_message = __( 'Forge Admin Suite manifest entry has no JS file.', 'forge-admin-suite' );
			return;
		}

		$this->module_handles = array_values( $handles );

		$app_handle = reset( $handles );
		if ( $app_handle ) {
			wp_add_inline_script( $app_handle, $this->get_inline_config(), 'before' );
		}
	}

	/**
	 * Enqueue a Vite manifest entry with its imports.
	 *
	 * @param array  $manifest Manifest array.
	 * @param string $key Manifest key.
	 * @param string $asset_base Asset base URL.
	 * @param array  $handles Script handles collector.
	 * @return void
	 */
	private function enqueue_manifest_entry( array $manifest, $key, $asset_base, array &$handles ) {
		if ( empty( $manifest[ $key ] ) || ! is_array( $manifest[ $key ] ) ) {
			return;
		}

		$entry = $manifest[ $key ];

		if ( ! empty( $entry['imports'] ) && is_array( $entry['imports'] ) ) {
			foreach ( $entry['imports'] as $import_key ) {
				$this->enqueue_manifest_entry( $manifest, $import_key, $asset_base, $handles );
			}
		}

		if ( ! empty( $entry['css'] ) && is_array( $entry['css'] ) ) {
			foreach ( $entry['css'] as $index => $css_file ) {
				$handle = 'forge-admin-suite-style-' . md5( $key . '-' . (string) $index );
				wp_enqueue_style( $handle, $asset_base . ltrim( $css_file, '/' ), array(), FORGE_ADMIN_SUITE_VERSION );
			}
		}

		if ( empty( $entry['file'] ) ) {
			return;
		}

		$handle = 'forge-admin-suite-script-' . md5( $key );
		if ( in_array( $handle, $handles, true ) ) {
			return;
		}

		wp_enqueue_script( $handle, $asset_base . ltrim( $entry['file'], '/' ), array(), FORGE_ADMIN_SUITE_VERSION, true );
		$handles[] = $handle;
	}

	/**
	 * Build inline config script.
	 *
	 * @return string
	 */
	private function get_inline_config() {
		$data = array(
			'restUrl'   => esc_url_raw( rest_url() ),
			'nonce'     => wp_create_nonce( 'wp_rest' ),
			'pluginUrl' => esc_url_raw( FORGE_ADMIN_SUITE_PLUGIN_URL ),
			'version'   => FORGE_ADMIN_SUITE_VERSION,
		);

		return 'window.forgeAdminSuite = ' . wp_json_encode( $data ) . ';';
	}
}
