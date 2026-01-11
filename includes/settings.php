<?php
/**
 * Settings helpers.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Settings helper utilities.
 */
final class Forge_Admin_Suite_Settings {
	/**
	 * Canonical origin option key.
	 *
	 * @var string
	 */
	const CANONICAL_ORIGIN_OPTION = 'forge_admin_suite_canonical_origin';

	/**
	 * Unique canonical base URL meta key.
	 *
	 * @var string
	 */
	const UNIQUE_CANONICAL_BASE_URL_META = 'forge_admin_suite_unique_canonical_base_url';

	/**
	 * Unique canonical preserve path meta key.
	 *
	 * @var string
	 */
	const UNIQUE_CANONICAL_PRESERVE_PATH_META = 'forge_admin_suite_unique_canonical_preserve_path';

	/**
	 * Get normalized canonical origin.
	 *
	 * @return string
	 */
	public static function get_canonical_origin() {
		$origin = get_option( self::CANONICAL_ORIGIN_OPTION, '' );

		if ( ! is_string( $origin ) ) {
			return '';
		}

		return self::sanitize_canonical_origin( $origin );
	}

	/**
	 * Update canonical origin option with sanitized value.
	 *
	 * @param string $origin Raw origin value.
	 * @return string
	 */
	public static function update_canonical_origin( $origin ) {
		$normalized = self::sanitize_canonical_origin( $origin );
		update_option( self::CANONICAL_ORIGIN_OPTION, $normalized );

		return $normalized;
	}

	/**
	 * Sanitize canonical origin value.
	 *
	 * @param string $origin Raw origin value.
	 * @return string
	 */
	public static function sanitize_canonical_origin( $origin ) {
		$validated = forge_admin_suite_validate_origin( $origin );
		if ( is_wp_error( $validated ) ) {
			return '';
		}

		return $validated;
	}
}

/**
 * Validate and normalize canonical origin.
 *
 * @param string $input Origin input.
 * @return string|WP_Error
 */
function forge_admin_suite_validate_origin( $input ) {
	$origin = is_string( $input ) ? trim( sanitize_text_field( $input ) ) : '';

	if ( '' === $origin ) {
		return '';
	}

	if ( false === strpos( $origin, '://' ) ) {
		$origin = 'https://' . $origin;
	}

	$parts = wp_parse_url( $origin );
	if ( empty( $parts['host'] ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_origin',
			__( 'Canonical origin must be a valid absolute URL (scheme + host).', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$scheme = isset( $parts['scheme'] ) ? strtolower( $parts['scheme'] ) : 'https';
	if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_origin',
			__( 'Canonical origin must use http or https.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$host = strtolower( $parts['host'] );
	if ( preg_match( '/[^a-z0-9.-]/', $host ) || false !== strpos( $host, '..' ) || '.' === $host[0] || '.' === substr( $host, -1 ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_origin',
			__( 'Canonical origin host is invalid.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$is_localhost = 'localhost' === $host;
	$is_loc       = str_ends_with( $host, '.loc' );
	$has_tld      = false;

	if ( false !== strpos( $host, '.' ) ) {
		$labels = explode( '.', $host );
		$tld    = end( $labels );
		$has_tld = is_string( $tld ) && strlen( $tld ) >= 2;
	}

	if ( ! $is_localhost && ! $is_loc && ! $has_tld ) {
		return new WP_Error(
			'forge_admin_suite_invalid_origin',
			__( 'Canonical origin must include a valid domain, .loc, or localhost.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$port       = isset( $parts['port'] ) ? (int) $parts['port'] : 0;
	$normalized = $scheme . '://' . $host;
	if ( $port > 0 ) {
		$normalized .= ':' . $port;
	}

	return untrailingslashit( $normalized );
}

/**
 * Validate and normalize unique canonical base URL.
 *
 * @param string $input Base URL input.
 * @return string|WP_Error
 */
function forge_admin_suite_validate_base_url( $input ) {
	$base_url = is_string( $input ) ? trim( sanitize_text_field( $input ) ) : '';

	if ( '' === $base_url ) {
		return '';
	}

	if ( false === strpos( $base_url, '://' ) ) {
		$base_url = 'https://' . $base_url;
	}

	$parts = wp_parse_url( $base_url );
	if ( empty( $parts['host'] ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_base_url',
			__( 'Base URL must be a valid absolute URL (scheme + host).', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$scheme = isset( $parts['scheme'] ) ? strtolower( $parts['scheme'] ) : 'https';
	if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_base_url',
			__( 'Base URL must use http or https.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$host = strtolower( $parts['host'] );
	if ( preg_match( '/[^a-z0-9.-]/', $host ) || false !== strpos( $host, '..' ) || '.' === $host[0] || '.' === substr( $host, -1 ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_base_url',
			__( 'Base URL host is invalid.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$is_localhost = 'localhost' === $host;
	$is_loc       = str_ends_with( $host, '.loc' );
	$has_tld      = false;

	if ( false !== strpos( $host, '.' ) ) {
		$labels = explode( '.', $host );
		$tld    = end( $labels );
		$has_tld = is_string( $tld ) && strlen( $tld ) >= 2;
	}

	if ( ! $is_localhost && ! $is_loc && ! $has_tld ) {
		return new WP_Error(
			'forge_admin_suite_invalid_base_url',
			__( 'Base URL must include a valid domain, .loc, or localhost.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$port = isset( $parts['port'] ) ? (int) $parts['port'] : 0;
	$path = isset( $parts['path'] ) ? $parts['path'] : '/';
	$path = '/' . ltrim( $path, '/' );

	if ( '/' !== $path && '/' !== substr( $path, -1 ) ) {
		$path .= '/';
	}

	$normalized = $scheme . '://' . $host;
	if ( $port > 0 ) {
		$normalized .= ':' . $port;
	}

	$normalized .= $path;

	return $normalized;
}
