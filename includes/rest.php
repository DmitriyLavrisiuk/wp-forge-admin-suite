<?php
/**
 * REST API endpoints.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST API handler.
 */
final class Forge_Admin_Suite_Rest {
	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			'forge-admin-suite/v1',
			'/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_status' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			'forge-admin-suite/v1',
			'/settings',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			'forge-admin-suite/v1',
			'/settings',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_settings' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}

	/**
	 * Check permissions and nonce.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return true|WP_Error
	 */
	public function check_permissions( $request ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'forge_admin_suite_forbidden',
				__( 'You do not have permission to access this endpoint.', 'forge-admin-suite' ),
				array( 'status' => 403 )
			);
		}

		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new WP_Error(
				'forge_admin_suite_invalid_nonce',
				__( 'Invalid REST nonce.', 'forge-admin-suite' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Return status payload.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_status( $request ) {
		$user = wp_get_current_user();

		$response = array(
			'ok'            => true,
			'pluginVersion' => FORGE_ADMIN_SUITE_VERSION,
			'wpVersion'     => sanitize_text_field( get_bloginfo( 'version' ) ),
			'phpVersion'    => sanitize_text_field( PHP_VERSION ),
			'serverTime'    => sanitize_text_field( current_time( 'c' ) ),
			'user'          => array(
				'id'   => (int) $user->ID,
				'name' => sanitize_text_field( $user->display_name ),
			),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Return settings payload.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_settings( $request ) {
		$response = array(
			'canonicalOrigin' => Forge_Admin_Suite_Settings::get_canonical_origin(),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Update settings payload.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function update_settings( $request ) {
		$canonical_origin = $request->get_param( 'canonicalOrigin' );
		$validated_origin = forge_admin_suite_validate_origin( $canonical_origin );

		if ( is_wp_error( $validated_origin ) ) {
			return $validated_origin;
		}

		update_option( Forge_Admin_Suite_Settings::CANONICAL_ORIGIN_OPTION, $validated_origin );

		$response = array(
			'canonicalOrigin' => $validated_origin,
		);

		return rest_ensure_response( $response );
	}
}
