<?php
/**
 * Open Graph locale integration for Yoast + Polylang.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Normalize locale to Open Graph format.
 *
 * @param string $locale Locale value.
 * @return string|null
 */
function forge_admin_suite_normalize_og_locale( $locale ) {
	if ( ! is_string( $locale ) ) {
		return null;
	}

	$normalized = trim( str_replace( '-', '_', $locale ) );
	if ( '' === $normalized ) {
		return null;
	}

	$segments = explode( '_', $normalized );
	if ( empty( $segments ) ) {
		return null;
	}

	$language = strtolower( array_shift( $segments ) );
	if ( '' === $language ) {
		return null;
	}

	if ( empty( $segments ) ) {
		return $language;
	}

	$region = strtoupper( array_shift( $segments ) );
	if ( '' === $region ) {
		return $language;
	}

	return $language . '_' . $region;
}

/**
 * Get current Polylang locale.
 *
 * @return string|null
 */
function forge_admin_suite_get_polylang_locale() {
	if ( ! function_exists( 'pll_current_language' ) ) {
		return null;
	}

	$locale = pll_current_language( 'locale' );
	if ( ! is_string( $locale ) ) {
		return null;
	}

	return forge_admin_suite_normalize_og_locale( $locale );
}

/**
 * Check if frontend locale filtering should run.
 *
 * @return bool
 */
function forge_admin_suite_should_filter_wpseo_locale() {
	if ( is_admin() || is_feed() || is_embed() || wp_doing_ajax() || wp_doing_cron() ) {
		return false;
	}

	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return false;
	}

	if ( function_exists( 'wp_is_json_request' ) && wp_is_json_request() ) {
		return false;
	}

	return true;
}

/**
 * Filter Yoast Open Graph locale with Polylang locale.
 *
 * @param string $locale       Yoast locale.
 * @param mixed  $presentation Yoast presentation object.
 * @return string
 */
function forge_admin_suite_filter_wpseo_og_locale( $locale, $presentation ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
	if ( ! forge_admin_suite_should_filter_wpseo_locale() ) {
		return $locale;
	}

	$polylang_locale = forge_admin_suite_get_polylang_locale();
	if ( null === $polylang_locale ) {
		return $locale;
	}

	return $polylang_locale;
}

/**
 * Filter Yoast fallback locale with Polylang locale.
 *
 * @param string $locale Yoast locale.
 * @return string
 */
function forge_admin_suite_filter_wpseo_locale( $locale ) {
	if ( ! forge_admin_suite_should_filter_wpseo_locale() ) {
		return $locale;
	}

	$polylang_locale = forge_admin_suite_get_polylang_locale();
	if ( null === $polylang_locale ) {
		return $locale;
	}

	return $polylang_locale;
}
