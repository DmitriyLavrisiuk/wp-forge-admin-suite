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

		$unique_rule = $this->get_unique_rule_for_request();
		$origin      = Forge_Admin_Suite_Settings::get_canonical_origin();

		if ( ! $unique_rule && '' === $origin ) {
			echo $head_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		echo $this->rewrite_head_canonical( $head_html, $origin, $unique_rule ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
	 * @param array|null $unique_rule Unique canonical rule.
	 * @return string
	 */
	private function rewrite_head_canonical( $head_html, $origin, $unique_rule ) {
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

		if ( $unique_rule ) {
			$new_canonical = $this->build_unique_canonical(
				$canonical_href,
				$unique_rule['baseUrl'],
				$unique_rule['preserveDefaultPath']
			);
		} else {
			$new_canonical = $this->build_canonical_from_origin( $canonical_href, $origin );
		}
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
	 * Build canonical URL from unique rule.
	 *
	 * @param string $source_url Source canonical URL.
	 * @param string $base_url Base URL.
	 * @param bool   $preserve_default_path Preserve default path flag.
	 * @return string
	 */
	private function build_unique_canonical( $source_url, $base_url, $preserve_default_path ) {
		$base_parts = wp_parse_url( $base_url );
		if ( empty( $base_parts['host'] ) ) {
			return '';
		}

		$base_origin = $base_parts['scheme'] . '://' . $base_parts['host'];
		if ( isset( $base_parts['port'] ) ) {
			$base_origin .= ':' . (int) $base_parts['port'];
		}

		$base_path = isset( $base_parts['path'] ) ? $base_parts['path'] : '/';
		$base_path = '/' . ltrim( $base_path, '/' );

		if ( '/' !== $base_path && '/' !== substr( $base_path, -1 ) ) {
			$base_path .= '/';
		}

		if ( ! $preserve_default_path ) {
			return $base_origin . $base_path;
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

		return $base_origin . $this->join_paths( $base_path, $path ) . $query;
	}

	/**
	 * Join two URL paths.
	 *
	 * @param string $base_path Base path.
	 * @param string $append_path Append path.
	 * @return string
	 */
	private function join_paths( $base_path, $append_path ) {
		$base_path   = '/' . trim( $base_path, '/' );
		$append_path = '/' . ltrim( $append_path, '/' );

		if ( '/' === $base_path ) {
			return $append_path;
		}

		return rtrim( $base_path, '/' ) . $append_path;
	}

	/**
	 * Get unique canonical rule for current request.
	 *
	 * @return array|null
	 */
	private function get_unique_rule_for_request() {
		if ( ! is_singular() ) {
			return null;
		}

		$post_id = (int) get_queried_object_id();
		if ( $post_id <= 0 ) {
			return null;
		}

		if ( ! $this->is_unique_canonical_post( $post_id ) ) {
			return null;
		}

		return $this->get_unique_rule_for_post( $post_id );
	}

	/**
	 * Check if a post supports unique canonical rules.
	 *
	 * @param int $post_id Post ID.
	 * @return bool
	 */
	private function is_unique_canonical_post( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return false;
		}

		if ( function_exists( 'forge_admin_suite_is_supported_post_type' ) ) {
			return forge_admin_suite_is_supported_post_type( $post->post_type );
		}

		if ( 'attachment' === $post->post_type ) {
			return false;
		}

		$type = get_post_type_object( $post->post_type );
		return (bool) ( $type && $type->public && $type->publicly_queryable );
	}

	/**
	 * Get unique canonical rule for a post.
	 *
	 * @param int $post_id Post ID.
	 * @return array|null
	 */
	private function get_unique_rule_for_post( $post_id ) {
		$base_url = get_post_meta( $post_id, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_BASE_URL_META, true );
		if ( ! is_string( $base_url ) || '' === $base_url ) {
			return null;
		}

		$preserve = get_post_meta( $post_id, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_PRESERVE_PATH_META, true );
		$preserve = '' === $preserve ? true : (bool) $preserve;

		return array(
			'baseUrl'             => $base_url,
			'preserveDefaultPath' => $preserve,
		);
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
