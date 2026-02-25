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
	 * General alternate links option key.
	 *
	 * @var string
	 */
	const GENERAL_ALTERNATE_LINKS_OPTION = 'forge_admin_suite_general_alternate_links';

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
	 * Unique alternate links meta key.
	 *
	 * @var string
	 */
	const UNIQUE_ALTERNATE_LINKS_META = 'forge_admin_suite_unique_alternate_links';

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

	/**
	 * Get general alternate links configuration.
	 *
	 * @return array
	 */
	public static function get_general_alternate_links() {
		$items = get_option( self::GENERAL_ALTERNATE_LINKS_OPTION, array() );

		return forge_admin_suite_sanitize_alternate_link_items( $items );
	}
}

/**
 * Normalize URL path with a leading and trailing slash.
 *
 * @param string $path Path input.
 * @return string
 */
function forge_admin_suite_normalize_url_path( $path ) {
	$normalized = is_string( $path ) ? $path : '/';
	$normalized = str_replace( '\\', '/', $normalized );

	if ( '' === $normalized ) {
		$normalized = '/';
	}

	$normalized = '/' . ltrim( $normalized, '/' );
	if ( '/' !== $normalized && '/' !== substr( $normalized, -1 ) ) {
		$normalized .= '/';
	}

	return $normalized;
}

/**
 * Validate and normalize canonical base URL.
 *
 * @param string $input Base URL input.
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
	$path       = isset( $parts['path'] ) ? forge_admin_suite_normalize_url_path( $parts['path'] ) : '/';
	$normalized = $scheme . '://' . $host;
	if ( $port > 0 ) {
		$normalized .= ':' . $port;
	}

	$normalized .= $path;

	return $normalized;
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
	$path = isset( $parts['path'] ) ? forge_admin_suite_normalize_url_path( $parts['path'] ) : '/';

	$normalized = $scheme . '://' . $host;
	if ( $port > 0 ) {
		$normalized .= ':' . $port;
	}

	$normalized .= $path;

	return $normalized;
}

/**
 * Validate and normalize hreflang value.
 *
 * @param string $input Hreflang input.
 * @return string|WP_Error
 */
function forge_admin_suite_validate_hreflang( $input ) {
	$hreflang = is_string( $input ) ? trim( sanitize_text_field( $input ) ) : '';
	$hreflang = strtolower( $hreflang );

	if ( '' === $hreflang ) {
		return new WP_Error(
			'forge_admin_suite_invalid_hreflang',
			__( 'Hreflang is required.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	if ( 'x-default' === $hreflang ) {
		return $hreflang;
	}

	if ( ! preg_match( '/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i', $hreflang ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_hreflang',
			__( 'Hreflang is invalid.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	return $hreflang;
}

/**
 * Validate and normalize general alternate link item.
 *
 * @param mixed $item Alternate link item.
 * @return array|WP_Error
 */
function forge_admin_suite_validate_alternate_link_item( $item ) {
	if ( ! is_array( $item ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_alternate_item',
			__( 'Alternate link item is invalid.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$hreflang = isset( $item['hreflang'] ) ? forge_admin_suite_validate_hreflang( $item['hreflang'] ) : '';
	if ( is_wp_error( $hreflang ) ) {
		return $hreflang;
	}

	$href_base_url = isset( $item['hrefBaseUrl'] ) ? forge_admin_suite_validate_base_url( $item['hrefBaseUrl'] ) : '';
	if ( is_wp_error( $href_base_url ) ) {
		return $href_base_url;
	}

	if ( '' === $href_base_url ) {
		return new WP_Error(
			'forge_admin_suite_invalid_alternate_url',
			__( 'Alternate link URL is required.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$preserve_raw = isset( $item['preserveDefaultPath'] ) ? $item['preserveDefaultPath'] : true;
	$preserve_raw = rest_sanitize_boolean( $preserve_raw );
	$preserve     = (bool) $preserve_raw;

	$base_parts = wp_parse_url( $href_base_url );
	$base_path  = isset( $base_parts['path'] ) ? forge_admin_suite_normalize_url_path( $base_parts['path'] ) : '/';

	$path_prefix = isset( $item['pathPrefix'] ) ? trim( sanitize_text_field( $item['pathPrefix'] ) ) : '';
	if ( $preserve && '/' === $base_path && '' !== $path_prefix ) {
		if ( preg_match( '#^[a-z][a-z0-9+.-]*://#i', $path_prefix ) ) {
			return new WP_Error(
				'forge_admin_suite_invalid_path_prefix',
				__( 'Path prefix must not include a scheme or host.', 'forge-admin-suite' ),
				array( 'status' => 400 )
			);
		}

		$path_prefix = str_replace( '\\', '/', $path_prefix );
		if ( '/' !== $path_prefix[0] || false !== strpos( $path_prefix, '?' ) || false !== strpos( $path_prefix, '#' ) ) {
			return new WP_Error(
				'forge_admin_suite_invalid_path_prefix',
				__( 'Path prefix must start with "/".', 'forge-admin-suite' ),
				array( 'status' => 400 )
			);
		}

		$trimmed     = trim( $path_prefix, '/' );
		$path_prefix = '' === $trimmed ? '' : '/' . $trimmed . '/';
	} else {
		$path_prefix = '';
	}

	return array(
		'hreflang'             => $hreflang,
		'hrefBaseUrl'          => $href_base_url,
		'preserveDefaultPath'  => $preserve,
		'pathPrefix'           => $path_prefix,
	);
}

/**
 * Validate and normalize alternate links payload.
 *
 * @param mixed $items Items payload.
 * @return array|WP_Error
 */
function forge_admin_suite_validate_alternate_links_payload( $items ) {
	if ( ! is_array( $items ) ) {
		return new WP_Error(
			'forge_admin_suite_invalid_alternate_items',
			__( 'Alternate links payload must be an array.', 'forge-admin-suite' ),
			array( 'status' => 400 )
		);
	}

	$validated = array();
	$seen      = array();

	foreach ( $items as $item ) {
		$normalized = forge_admin_suite_validate_alternate_link_item( $item );
		if ( is_wp_error( $normalized ) ) {
			return $normalized;
		}

		$hreflang = $normalized['hreflang'];
		if ( isset( $seen[ $hreflang ] ) ) {
			return new WP_Error(
				'forge_admin_suite_duplicate_hreflang',
				__( 'Hreflang values must be unique.', 'forge-admin-suite' ),
				array( 'status' => 400 )
			);
		}

		$seen[ $hreflang ] = true;
		$validated[]       = $normalized;
	}

	return $validated;
}

/**
 * Sanitize alternate links list without failing hard.
 *
 * @param mixed $items Items payload.
 * @return array
 */
function forge_admin_suite_sanitize_alternate_link_items( $items ) {
	if ( ! is_array( $items ) ) {
		return array();
	}

	$validated = array();
	$seen      = array();

	foreach ( $items as $item ) {
		$normalized = forge_admin_suite_validate_alternate_link_item( $item );
		if ( is_wp_error( $normalized ) ) {
			continue;
		}

		$hreflang = $normalized['hreflang'];
		if ( isset( $seen[ $hreflang ] ) ) {
			continue;
		}

		$seen[ $hreflang ] = true;
		$validated[]       = $normalized;
	}

	return $validated;
}
