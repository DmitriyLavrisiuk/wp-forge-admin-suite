<?php
/**
 * General link tags rules for frontend pages.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles canonical replacement on frontend output.
 */
final class Forge_Admin_Suite_General_Link_Tags {
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

		$unique_rule         = $this->get_unique_rule_for_request();
		$canonical_base_url  = Forge_Admin_Suite_Settings::get_canonical_origin();
		$general_links       = Forge_Admin_Suite_Settings::get_general_alternate_links();
		$unique_links        = $this->get_unique_alternate_links_for_request();
		$alternate_links     = $this->merge_alternate_links( $general_links, $unique_links );

		if ( ! $unique_rule && '' === $canonical_base_url && empty( $alternate_links ) ) {
			echo $head_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		echo $this->rewrite_head_links( $head_html, $canonical_base_url, $unique_rule, $alternate_links ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
	 * Rewrite canonical and alternate tags in head HTML.
	 *
	 * @param string $head_html Head HTML.
	 * @param string $canonical_base_url Canonical base URL.
	 * @param array|null $unique_rule Unique canonical rule.
	 * @param array $alternate_links Alternate link items.
	 * @return string
	 */
	private function rewrite_head_links( $head_html, $canonical_base_url, $unique_rule, $alternate_links ) {
		$canonical_href = '';
		$pattern        = '#<link\b[^>]*\brel=(["\'])canonical\1[^>]*>\s*#i';
		$should_replace_canonical = ( $unique_rule || '' !== $canonical_base_url );

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

			if ( $should_replace_canonical ) {
				$head_html = preg_replace( $pattern, '', $head_html );
				if ( null === $head_html ) {
					return $original_head;
				}
			}
		}

		if ( '' === $canonical_href ) {
			$canonical_href = $this->get_fallback_canonical();
		}

		$current_path = $this->get_path_from_url( $canonical_href );

		$canonical_tag = '';
		if ( $should_replace_canonical ) {
			if ( $unique_rule ) {
				$new_canonical = $this->build_unique_canonical(
					$canonical_href,
					$unique_rule['baseUrl'],
					$unique_rule['preserveDefaultPath']
				);
			} else {
				$new_canonical = $this->build_canonical_from_base_url( $canonical_href, $canonical_base_url );
			}

			if ( '' !== $new_canonical ) {
				$canonical_tag = '<link rel="canonical" href="' . esc_url( $new_canonical ) . '" />' . "\n";
			}
		}

		$alternate_tags = $this->build_alternate_tags( $alternate_links, $current_path );
		if ( '' !== $alternate_tags ) {
			$head_html = $this->remove_alternate_links( $head_html, $alternate_links );
		}

		return $canonical_tag . $alternate_tags . $head_html;
	}

	/**
	 * Merge general and unique alternate links by hreflang.
	 *
	 * @param array $general_links General alternate links.
	 * @param array $unique_links Unique alternate links.
	 * @return array
	 */
	private function merge_alternate_links( $general_links, $unique_links ) {
		$merged = array();

		foreach ( $general_links as $item ) {
			if ( ! is_array( $item ) || empty( $item['hreflang'] ) ) {
				continue;
			}

			$hreflang = strtolower( (string) $item['hreflang'] );
			$merged[ $hreflang ] = $item;
		}

		foreach ( $unique_links as $item ) {
			if ( ! is_array( $item ) || empty( $item['hreflang'] ) ) {
				continue;
			}

			$hreflang = strtolower( (string) $item['hreflang'] );
			$merged[ $hreflang ] = $item;
		}

		return array_values( $merged );
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
	 * Extract a path from a URL.
	 *
	 * @param string $url URL to parse.
	 * @return string
	 */
	private function get_path_from_url( $url ) {
		$path = wp_parse_url( $url, PHP_URL_PATH );
		$path = is_string( $path ) ? $path : '';

		if ( '' === $path ) {
			$path = '/';
		} elseif ( '/' !== $path[0] ) {
			$path = '/' . ltrim( $path, '/' );
		}

		return $path;
	}

	/**
	 * Build canonical URL from the configured general base URL.
	 *
	 * @param string $source_url Source URL.
	 * @param string $base_url Canonical base URL.
	 * @return string
	 */
	private function build_canonical_from_base_url( $source_url, $base_url ) {
		$base_parts = wp_parse_url( $base_url );
		if ( empty( $base_parts['host'] ) || empty( $base_parts['scheme'] ) ) {
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

		$source_parts = wp_parse_url( $source_url );
		$path         = $this->get_path_from_url( $source_url );

		$query = '';
		if ( isset( $source_parts['query'] ) && '' !== $source_parts['query'] ) {
			$query = '?' . $source_parts['query'];
		}

		return $base_origin . $this->join_paths( $base_path, $path ) . $query;
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
	 * Build alternate tags from items.
	 *
	 * @param array  $alternate_links Alternate link items.
	 * @param string $current_path Current path.
	 * @return string
	 */
	private function build_alternate_tags( $alternate_links, $current_path ) {
		if ( empty( $alternate_links ) || ! is_array( $alternate_links ) ) {
			return '';
		}

		$tags = '';
		foreach ( $alternate_links as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$href = $this->build_alternate_href( $current_path, $item );
			if ( '' === $href || empty( $item['hreflang'] ) ) {
				continue;
			}

			$tags .= '<link rel="alternate" hreflang="' . esc_attr( $item['hreflang'] ) . '" href="' . esc_url( $href ) . "\" />\n";
		}

		return $tags;
	}

	/**
	 * Build alternate href for an item.
	 *
	 * @param string $current_path Current path.
	 * @param array  $item Alternate item.
	 * @return string
	 */
	private function build_alternate_href( $current_path, $item ) {
		if ( empty( $item['hrefBaseUrl'] ) || ! is_string( $item['hrefBaseUrl'] ) ) {
			return '';
		}

		$base_parts = wp_parse_url( $item['hrefBaseUrl'] );
		if ( empty( $base_parts['host'] ) || empty( $base_parts['scheme'] ) ) {
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

		$preserve = ! empty( $item['preserveDefaultPath'] );
		if ( ! $preserve ) {
			return $base_origin . $base_path;
		}

		$prefix = isset( $item['pathPrefix'] ) && is_string( $item['pathPrefix'] ) ? $item['pathPrefix'] : '';
		if ( '' === $prefix ) {
			$prefix = '/';
		}

		$path = $this->join_paths( $prefix, $current_path );
		return $base_origin . $this->join_paths( $base_path, $path );
	}

	/**
	 * Remove managed alternate tags from head HTML.
	 *
	 * @param string $head_html Head HTML.
	 * @param array  $alternate_links Alternate links.
	 * @return string
	 */
	private function remove_alternate_links( $head_html, $alternate_links ) {
		if ( empty( $alternate_links ) || ! is_array( $alternate_links ) ) {
			return $head_html;
		}

		$original_head = $head_html;
		$hreflangs     = array();

		foreach ( $alternate_links as $item ) {
			if ( ! is_array( $item ) || empty( $item['hreflang'] ) ) {
				continue;
			}

			$hreflang = strtolower( (string) $item['hreflang'] );
			if ( '' === $hreflang ) {
				continue;
			}

			$hreflangs[ $hreflang ] = true;
		}

		if ( empty( $hreflangs ) ) {
			return $head_html;
		}

		foreach ( array_keys( $hreflangs ) as $hreflang ) {
			$quoted  = preg_quote( $hreflang, '#' );
			$pattern = '#<link\b(?=[^>]*\brel=(["\'])alternate\1)(?=[^>]*\bhreflang=(["\'])' . $quoted . '\2)[^>]*>\s*#i';

			$head_html = preg_replace( $pattern, '', $head_html );
			if ( null === $head_html ) {
				return $original_head;
			}
		}

		return $head_html;
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
	 * Get unique alternate links for current request.
	 *
	 * @return array
	 */
	private function get_unique_alternate_links_for_request() {
		if ( ! is_singular() ) {
			return array();
		}

		$post_id = (int) get_queried_object_id();
		if ( $post_id <= 0 ) {
			return array();
		}

		if ( ! $this->is_unique_canonical_post( $post_id ) ) {
			return array();
		}

		$items = get_post_meta( $post_id, Forge_Admin_Suite_Settings::UNIQUE_ALTERNATE_LINKS_META, true );
		if ( function_exists( 'forge_admin_suite_sanitize_alternate_link_items' ) ) {
			return forge_admin_suite_sanitize_alternate_link_items( $items );
		}

		return array();
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
