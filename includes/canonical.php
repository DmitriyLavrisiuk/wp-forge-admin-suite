<?php
/**
 * Canonical URL manager.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles canonical settings and output.
 */
final class Forge_Admin_Suite_Canonical {
	/**
	 * Settings option name.
	 *
	 * @var string
	 */
	const OPTION_NAME = 'forge_admin_suite_canonical_settings';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'wp', array( $this, 'register_frontend_canonical' ) );
	}

	/**
	 * Register canonical output for frontend requests.
	 *
	 * @return void
	 */
	public function register_frontend_canonical() {
		if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		if ( $this->is_yoast_active() ) {
			add_filter( 'wpseo_canonical', array( $this, 'filter_wpseo_canonical' ) );
			return;
		}

		remove_action( 'wp_head', 'rel_canonical' );
		add_action( 'wp_head', array( $this, 'render_canonical_tag' ), 1 );
	}

	/**
	 * Filter Yoast canonical output.
	 *
	 * @param string $canonical Canonical URL.
	 * @return string
	 */
	public function filter_wpseo_canonical( $canonical ) {
		$computed = $this->get_canonical_url();
		return $computed ? $computed : $canonical;
	}

	/**
	 * Render canonical tag when Yoast is not active.
	 *
	 * @return void
	 */
	public function render_canonical_tag() {
		$canonical = $this->get_canonical_url();
		if ( ! $canonical ) {
			return;
		}

		echo '<link rel="canonical" href="' . esc_url( $canonical ) . "\" />\n";
	}

	/**
	 * Get computed canonical URL.
	 *
	 * @return string
	 */
	public function get_canonical_url() {
		$settings = $this->get_settings();
		$base     = $this->get_base_url();

		if ( ! $base ) {
			return '';
		}

		$canonical = $base;
		if ( 'local' !== $settings['mode'] ) {
			$canonical = $this->apply_global_rules( $canonical, $settings );
		}

		$override = $this->get_active_override( $settings );
		if ( $override ) {
			$canonical = $this->apply_override( $canonical, $override, $settings );
		}

		return $canonical;
	}

	/**
	 * Get canonical settings with defaults applied.
	 *
	 * @return array
	 */
	public function get_settings() {
		$defaults = $this->get_default_settings();
		$stored   = get_option( self::OPTION_NAME, array() );

		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		$merged = array_replace_recursive( $defaults, $stored );

		return $this->sanitize_settings( $merged );
	}

	/**
	 * Update canonical settings.
	 *
	 * @param array $input Settings input.
	 * @return array
	 */
	public function update_settings( array $input ) {
		$sanitized = $this->sanitize_settings( $input );
		update_option( self::OPTION_NAME, $sanitized );

		return $sanitized;
	}

	/**
	 * Sanitize settings payload.
	 *
	 * @param array $input Settings input.
	 * @return array
	 */
	public function sanitize_settings( array $input ) {
		$defaults = $this->get_default_settings();
		$input    = array_replace_recursive( $defaults, $input );

		$mode = in_array( $input['mode'], array( 'combined', 'global', 'local' ), true ) ? $input['mode'] : 'combined';

		$enabled_entity_types = array(
			'post'     => ! empty( $input['enabledEntityTypes']['post'] ),
			'page'     => ! empty( $input['enabledEntityTypes']['page'] ),
			'cpt'      => ! empty( $input['enabledEntityTypes']['cpt'] ),
			'taxonomy' => ! empty( $input['enabledEntityTypes']['taxonomy'] ),
			'dynamic'  => ! empty( $input['enabledEntityTypes']['dynamic'] ),
		);

		$page_size = absint( $input['pageSize'] );
		if ( $page_size <= 0 ) {
			$page_size = 50;
		}

		$normalize = array(
			'forceHttps'    => ! empty( $input['normalize']['forceHttps'] ),
			'trailingSlash' => ! empty( $input['normalize']['trailingSlash'] ),
			'stripHash'     => true,
			'stripQuery'    => ! empty( $input['normalize']['stripQuery'] ),
		);

		$domain = array(
			'targetDomain' => $this->sanitize_domain( $input['domain']['targetDomain'] ),
		);

		$locales = array();
		if ( is_array( $input['locale']['locales'] ) ) {
			foreach ( $input['locale']['locales'] as $locale ) {
				$locale = sanitize_text_field( $locale );
				if ( '' === $locale ) {
					continue;
				}
				$locales[] = $locale;
			}
		}
		$locales = array_values( array_unique( $locales ) );

		$default_locale = sanitize_text_field( $input['locale']['defaultLocale'] );
		if ( '' === $default_locale || ! in_array( $default_locale, $locales, true ) ) {
			$default_locale = ! empty( $locales ) ? $locales[0] : 'en';
		}

		$locale = array(
			'enabled'       => ! empty( $input['locale']['enabled'] ),
			'locales'       => $locales,
			'defaultLocale' => $default_locale,
			'strategy'      => 'prefix',
		);

		$allowlist = array();
		if ( is_array( $input['query']['allowlist'] ) ) {
			foreach ( $input['query']['allowlist'] as $key ) {
				$key = sanitize_key( $key );
				if ( '' === $key ) {
					continue;
				}
				$allowlist[] = $key;
			}
		}
		$allowlist = array_values( array_unique( $allowlist ) );

		$query = array(
			'allowlist' => $allowlist,
		);

		$dynamic = array(
			'search' => $this->sanitize_override( $input['dynamicCanonicals']['search'] ),
			'author' => $this->sanitize_override( $input['dynamicCanonicals']['author'] ),
			'date'   => $this->sanitize_override( $input['dynamicCanonicals']['date'] ),
			'404'    => $this->sanitize_override( $input['dynamicCanonicals']['404'] ),
		);

		return array(
			'mode'               => $mode,
			'enabledEntityTypes' => $enabled_entity_types,
			'pageSize'           => $page_size,
			'normalize'          => $normalize,
			'domain'             => $domain,
			'locale'             => $locale,
			'query'              => $query,
			'dynamicCanonicals'  => $dynamic,
		);
	}

	/**
	 * Get default settings.
	 *
	 * @return array
	 */
	private function get_default_settings() {
		return array(
			'mode'               => 'combined',
			'enabledEntityTypes' => array(
				'post'     => true,
				'page'     => true,
				'cpt'      => true,
				'taxonomy' => true,
				'dynamic'  => true,
			),
			'pageSize'           => 50,
			'normalize'          => array(
				'forceHttps'    => true,
				'trailingSlash' => true,
				'stripHash'     => true,
				'stripQuery'    => true,
			),
			'domain'             => array(
				'targetDomain' => '',
			),
			'locale'             => array(
				'enabled'       => false,
				'locales'       => array( 'en', 'en-in', 'us', 'ru' ),
				'defaultLocale' => 'en',
				'strategy'      => 'prefix',
			),
			'query'              => array(
				'allowlist' => array(),
			),
			'dynamicCanonicals'  => array(
				'search' => null,
				'author' => null,
				'date'   => null,
				'404'    => null,
			),
		);
	}

	/**
	 * Determine if Yoast SEO is active.
	 *
	 * @return bool
	 */
	private function is_yoast_active() {
		return defined( 'WPSEO_VERSION' ) || class_exists( 'WPSEO_Frontend' );
	}

	/**
	 * Get base canonical URL for current request.
	 *
	 * @return string
	 */
	private function get_base_url() {
		if ( is_singular() ) {
			return (string) get_permalink();
		}

		if ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();
			if ( $term && ! is_wp_error( $term ) ) {
				$link = get_term_link( $term );
				if ( ! is_wp_error( $link ) ) {
					return (string) $link;
				}
			}
		}

		if ( is_search() ) {
			return (string) get_search_link();
		}

		if ( is_author() ) {
			$author_id = get_queried_object_id();
			return (string) get_author_posts_url( $author_id );
		}

		if ( is_date() ) {
			$year  = (int) get_query_var( 'year' );
			$month = (int) get_query_var( 'monthnum' );
			$day   = (int) get_query_var( 'day' );

			if ( $year && $month && $day ) {
				return (string) get_day_link( $year, $month, $day );
			}

			if ( $year && $month ) {
				return (string) get_month_link( $year, $month );
			}

			if ( $year ) {
				return (string) get_year_link( $year );
			}
		}

		if ( is_404() ) {
			return (string) home_url( '/404/' );
		}

		global $wp;
		$path = is_object( $wp ) && isset( $wp->request ) ? $wp->request : '';
		return (string) home_url( $path );
	}

	/**
	 * Apply global settings to a URL.
	 *
	 * @param string $url URL to modify.
	 * @param array  $settings Settings array.
	 * @return string
	 */
	private function apply_global_rules( $url, array $settings ) {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return $url;
		}

		if ( ! empty( $settings['normalize']['forceHttps'] ) ) {
			$parts['scheme'] = 'https';
		}

		if ( ! empty( $settings['domain']['targetDomain'] ) ) {
			$parts['host'] = $settings['domain']['targetDomain'];
			unset( $parts['port'] );
		}

		$path = isset( $parts['path'] ) ? $parts['path'] : '/';
		$path = $this->normalize_path( $path, ! empty( $settings['normalize']['trailingSlash'] ) );

		if ( ! empty( $settings['locale']['enabled'] ) ) {
			$path = $this->apply_locale_prefix( $path, $settings['locale']['defaultLocale'], $settings['locale']['locales'] );
		}

		$parts['path'] = $path;

		$query = $this->apply_query_rules( $parts, $settings );
		$parts['query'] = $query;

		unset( $parts['fragment'] );

		return $this->build_url( $parts );
	}

	/**
	 * Apply local override to a URL.
	 *
	 * @param string $url URL to modify.
	 * @param array  $override Override data.
	 * @param array  $settings Settings array.
	 * @return string
	 */
	private function apply_override( $url, array $override, array $settings ) {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return $url;
		}

		if ( ! empty( $override['domain'] ) ) {
			$parts['host'] = $override['domain'];
			unset( $parts['port'] );
		}

		$path = isset( $parts['path'] ) ? $parts['path'] : '/';

		if ( ! empty( $override['path'] ) ) {
			$path = $override['path'];
		}

		$path = $this->normalize_path( $path, ! empty( $settings['normalize']['trailingSlash'] ) );

		if ( ! empty( $override['locale'] ) ) {
			$path = $this->apply_locale_prefix( $path, $override['locale'], $settings['locale']['locales'] );
		} elseif ( ! empty( $settings['locale']['enabled'] ) ) {
			$path = $this->apply_locale_prefix( $path, $settings['locale']['defaultLocale'], $settings['locale']['locales'] );
		}

		$parts['path'] = $path;

		if ( isset( $override['query'] ) && is_array( $override['query'] ) ) {
			$parts['query'] = $override['query'];
		}

		$parts['query'] = $this->apply_query_rules( $parts, $settings );

		unset( $parts['fragment'] );

		return $this->build_url( $parts );
	}

	/**
	 * Apply query settings to parsed URL parts.
	 *
	 * @param array $parts URL parts.
	 * @param array $settings Settings array.
	 * @return string
	 */
	private function apply_query_rules( array $parts, array $settings ) {
		if ( ! empty( $settings['normalize']['stripQuery'] ) ) {
			return '';
		}

		$query = array();
		if ( ! empty( $parts['query'] ) ) {
			if ( is_string( $parts['query'] ) ) {
				wp_parse_str( $parts['query'], $query );
			} elseif ( is_array( $parts['query'] ) ) {
				$query = $parts['query'];
			}
		}

		$allowlist = isset( $settings['query']['allowlist'] ) && is_array( $settings['query']['allowlist'] )
			? $settings['query']['allowlist']
			: array();

		$filtered = array();
		foreach ( $allowlist as $key ) {
			if ( array_key_exists( $key, $query ) ) {
				$filtered[ $key ] = $query[ $key ];
			}
		}

		if ( empty( $filtered ) ) {
			return '';
		}

		ksort( $filtered );

		return http_build_query( $filtered, '', '&', PHP_QUERY_RFC3986 );
	}

	/**
	 * Normalize a URL path.
	 *
	 * @param string $path Path.
	 * @param bool   $trailing_slash Whether to enforce trailing slash.
	 * @return string
	 */
	private function normalize_path( $path, $trailing_slash ) {
		$path = '/' . ltrim( (string) $path, '/' );

		if ( $trailing_slash && '/' !== $path && '/' !== substr( $path, -1 ) ) {
			$path .= '/';
		}

		return $path;
	}

	/**
	 * Apply locale prefix to a path.
	 *
	 * @param string $path Path.
	 * @param string $locale Locale to apply.
	 * @param array  $locales Known locales.
	 * @return string
	 */
	private function apply_locale_prefix( $path, $locale, array $locales ) {
		if ( '' === $locale ) {
			return $path;
		}

		$path = $this->strip_locale_prefix( $path, $locales );
		$prefix = '/' . trim( $locale, '/' );

		return $this->normalize_path( $prefix . '/' . ltrim( $path, '/' ), true );
	}

	/**
	 * Strip locale prefix from path.
	 *
	 * @param string $path Path.
	 * @param array  $locales Known locales.
	 * @return string
	 */
	private function strip_locale_prefix( $path, array $locales ) {
		foreach ( $locales as $locale ) {
			$locale = preg_quote( $locale, '/' );
			if ( preg_match( '#^/' . $locale . '(/|$)#', $path ) ) {
				$path = preg_replace( '#^/' . $locale . '#', '', $path, 1 );
				break;
			}
		}

		return $path;
	}

	/**
	 * Build URL from parts.
	 *
	 * @param array $parts URL parts.
	 * @return string
	 */
	private function build_url( array $parts ) {
		$scheme = isset( $parts['scheme'] ) ? $parts['scheme'] : 'https';
		$host   = isset( $parts['host'] ) ? $parts['host'] : parse_url( home_url(), PHP_URL_HOST );

		if ( ! $host ) {
			return '';
		}

		$url = $scheme . '://' . $host;

		if ( ! empty( $parts['port'] ) ) {
			$url .= ':' . $parts['port'];
		}

		$path = isset( $parts['path'] ) ? $parts['path'] : '/';
		$url .= $path;

		if ( ! empty( $parts['query'] ) ) {
			$url .= '?' . $parts['query'];
		}

		return $url;
	}

	/**
	 * Get active override for current context.
	 *
	 * @param array $settings Canonical settings.
	 * @return array|null
	 */
	private function get_active_override( array $settings ) {
		$mode = $settings['mode'];
		if ( 'global' === $mode ) {
			return null;
		}

		$override = null;
		if ( is_singular() ) {
			$override = get_post_meta( get_the_ID(), '_forge_admin_suite_canonical_override', true );
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();
			if ( $term && isset( $term->term_id ) ) {
				$override = get_term_meta( $term->term_id, '_forge_admin_suite_canonical_override', true );
			}
		} elseif ( ! empty( $settings['enabledEntityTypes']['dynamic'] ) ) {
			$override = $this->get_dynamic_override( $settings );
		}

		$override = $this->decode_override( $override );
		if ( ! is_array( $override ) ) {
			return null;
		}

		$override = $this->sanitize_override( $override );
		if ( empty( $override['enabled'] ) ) {
			return null;
		}

		return $override;
	}

	/**
	 * Get dynamic override from settings.
	 *
	 * @param array $settings Canonical settings.
	 * @return array|null
	 */
	private function get_dynamic_override( array $settings ) {
		if ( is_search() ) {
			return $settings['dynamicCanonicals']['search'];
		}

		if ( is_author() ) {
			return $settings['dynamicCanonicals']['author'];
		}

		if ( is_date() ) {
			return $settings['dynamicCanonicals']['date'];
		}

		if ( is_404() ) {
			return $settings['dynamicCanonicals']['404'];
		}

		return null;
	}

	/**
	 * Decode override value when stored as JSON.
	 *
	 * @param mixed $override Override value.
	 * @return mixed
	 */
	private function decode_override( $override ) {
		if ( is_string( $override ) && '' !== $override ) {
			$decoded = json_decode( $override, true );
			if ( is_array( $decoded ) ) {
				return $decoded;
			}
		}

		return $override;
	}

	/**
	 * Sanitize override parts.
	 *
	 * @param mixed $override Override input.
	 * @return array|null
	 */
	private function sanitize_override( $override ) {
		if ( ! is_array( $override ) ) {
			return null;
		}

		$enabled = array_key_exists( 'enabled', $override ) ? ! empty( $override['enabled'] ) : true;

		$domain = $this->sanitize_domain( $override['domain'] ?? '' );
		$locale = sanitize_text_field( $override['locale'] ?? '' );
		$path   = sanitize_text_field( $override['path'] ?? '' );

		if ( '' !== $path ) {
			$path = '/' . ltrim( $path, '/' );
		}

		$query = null;
		if ( isset( $override['query'] ) && is_array( $override['query'] ) ) {
			$query = array();
			foreach ( $override['query'] as $key => $value ) {
				$key = sanitize_key( $key );
				if ( '' === $key ) {
					continue;
				}
				$query[ $key ] = sanitize_text_field( $value );
			}
		}

		return array(
			'enabled' => $enabled,
			'domain'  => $domain ? $domain : null,
			'locale'  => $locale ? $locale : null,
			'path'    => $path ? $path : null,
			'query'   => $query,
		);
	}

	/**
	 * Sanitize a domain input.
	 *
	 * @param string $domain Domain input.
	 * @return string
	 */
	private function sanitize_domain( $domain ) {
		$domain = trim( (string) $domain );
		if ( '' === $domain ) {
			return '';
		}

		if ( false !== strpos( $domain, '://' ) ) {
			$parsed = wp_parse_url( $domain );
			if ( is_array( $parsed ) && ! empty( $parsed['host'] ) ) {
				$domain = $parsed['host'];
			}
		}

		$domain = preg_replace( '/[:\/].*/', '', $domain );
		$domain = strtolower( sanitize_text_field( $domain ) );

		$is_valid = filter_var( $domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME );
		if ( ! $is_valid ) {
			return '';
		}

		return $domain;
	}
}
