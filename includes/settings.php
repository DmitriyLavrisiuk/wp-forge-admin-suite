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
		$origin = is_string( $origin ) ? trim( sanitize_text_field( $origin ) ) : '';

		if ( '' === $origin ) {
			return '';
		}

		if ( false === strpos( $origin, '://' ) ) {
			$origin = 'https://' . $origin;
		}

		$parts = wp_parse_url( $origin );
		if ( empty( $parts['host'] ) ) {
			return '';
		}

		$scheme = isset( $parts['scheme'] ) ? strtolower( $parts['scheme'] ) : 'https';
		if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
			$scheme = 'https';
		}

		$host = strtolower( $parts['host'] );
		$port = isset( $parts['port'] ) ? (int) $parts['port'] : 0;

		$normalized = $scheme . '://' . $host;
		if ( $port ) {
			$normalized .= ':' . $port;
		}

		return $normalized;
	}
}
