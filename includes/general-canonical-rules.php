<?php
/**
 * General canonical rules for frontend pages.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles canonical replacement on frontend output.
 */
final class Forge_Admin_Suite_General_Canonical_Rules {
	/**
	 * Whether output buffering is active.
	 *
	 * @var bool
	 */
	private $is_buffering = false;

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'wp_head', array( $this, 'start_buffer' ), 0 );
		add_action( 'wp_head', array( $this, 'end_buffer' ), PHP_INT_MAX );
	}

	/**
	 * Start head output buffering.
	 *
	 * @return void
	 */
	public function start_buffer() {
		if ( $this->is_buffering || ! $this->should_buffer() ) {
			return;
		}

		$this->is_buffering = true;
		ob_start();
	}

	/**
	 * End head output buffering and output rewritten markup.
	 *
	 * @return void
	 */
	public function end_buffer() {
		if ( ! $this->is_buffering ) {
			return;
		}

		$head_html = ob_get_clean();
		$this->is_buffering = false;

		if ( ! is_string( $head_html ) ) {
			return;
		}

		$origin = Forge_Admin_Suite_Settings::get_canonical_origin();
		if ( '' === $origin ) {
			echo $head_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		echo $this->rewrite_head_canonical( $head_html, $origin ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Determine if buffering should run for this request.
	 *
	 * @return bool
	 */
	private function should_buffer() {
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
	 * Rewrite canonical tag in head HTML.
	 *
	 * @param string $head_html Head HTML.
	 * @param string $origin Canonical origin.
	 * @return string
	 */
	private function rewrite_head_canonical( $head_html, $origin ) {
		$canonical_href = '';
		$pattern        = '#<link\b[^>]*\brel=(["\'])canonical\1[^>]*>\s*#i';

		$match_result = preg_match_all( $pattern, $head_html, $matches );
		if ( false === $match_result ) {
			return $head_html;
		}

		if ( $match_result ) {
			$original_head = $head_html;
			foreach ( $matches[0] as $tag ) {
				if ( '' === $canonical_href && preg_match( '/href=["\']([^"\']+)["\']/i', $tag, $href_match ) ) {
					$canonical_href = $href_match[1];
				}
			}

			$head_html = preg_replace( $pattern, '', $head_html );
			if ( null === $head_html ) {
				return $original_head;
			}
		}

		if ( '' === $canonical_href ) {
			$canonical_href = $this->get_fallback_canonical();
		}

		$new_canonical = $this->build_canonical_from_origin( $canonical_href, $origin );
		if ( '' === $new_canonical ) {
			return $head_html;
		}

		$canonical_tag = '<link rel="canonical" href="' . esc_url( $new_canonical ) . '" />' . "\n";

		return $canonical_tag . $head_html;
	}

	/**
	 * Build fallback canonical URL without query string.
	 *
	 * @return string
	 */
	private function get_fallback_canonical() {
		global $wp;

		if ( isset( $wp ) && is_object( $wp ) && isset( $wp->request ) ) {
			$path = '/' . ltrim( (string) $wp->request, '/' );
			return home_url( $path );
		}

		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
		$request_uri = strtok( $request_uri, '?' );
		$request_uri = strtok( $request_uri, '#' );

		return home_url( $request_uri ?: '/' );
	}

	/**
	 * Replace scheme and host of a URL with the configured origin.
	 *
	 * @param string $source_url Source URL.
	 * @param string $origin Origin to inject.
	 * @return string
	 */
	private function build_canonical_from_origin( $source_url, $origin ) {
		$origin_parts = wp_parse_url( $origin );
		if ( empty( $origin_parts['host'] ) ) {
			return '';
		}

		$source_parts = wp_parse_url( $source_url );
		$path         = isset( $source_parts['path'] ) ? $source_parts['path'] : '';

		if ( '' === $path ) {
			$path = '/';
		} elseif ( '/' !== $path[0] ) {
			$path = '/' . ltrim( $path, '/' );
		}

		$query = '';
		if ( isset( $source_parts['query'] ) && '' !== $source_parts['query'] ) {
			$query = '?' . $source_parts['query'];
		}

		return untrailingslashit( $origin ) . $path . $query;
	}

	/**
	 * Build URL from parts.
	 *
	 * @param array $parts Parsed URL parts.
	 * @return string
	 */
	private function build_url( array $parts ) {
		$scheme = isset( $parts['scheme'] ) ? $parts['scheme'] . '://' : '';
		$user   = isset( $parts['user'] ) ? $parts['user'] : '';
		$pass   = isset( $parts['pass'] ) ? ':' . $parts['pass'] : '';
		$auth   = $user ? $user . $pass . '@' : '';
		$host   = isset( $parts['host'] ) ? $parts['host'] : '';
		$port   = isset( $parts['port'] ) ? ':' . $parts['port'] : '';
		$path   = isset( $parts['path'] ) ? $parts['path'] : '';
		$query  = isset( $parts['query'] ) && '' !== $parts['query'] ? '?' . $parts['query'] : '';
		$frag   = isset( $parts['fragment'] ) && '' !== $parts['fragment'] ? '#' . $parts['fragment'] : '';

		return $scheme . $auth . $host . $port . $path . $query . $frag;
	}
}
