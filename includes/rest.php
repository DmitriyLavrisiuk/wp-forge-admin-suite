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

		register_rest_route(
			'forge-admin-suite/v1',
			'/unique-canonical/entities',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_unique_canonical_entities' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			'forge-admin-suite/v1',
			'/unique-canonical/rule/(?P<id>\\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_unique_canonical_rule' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			'forge-admin-suite/v1',
			'/unique-canonical/rule/(?P<id>\\d+)',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_unique_canonical_rule' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			'forge-admin-suite/v1',
			'/unique-canonical/rule/(?P<id>\\d+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'delete_unique_canonical_rule' ),
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

	/**
	 * List entities with unique canonical rules.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_unique_canonical_entities( $request ) {
		$page     = max( 1, absint( $request->get_param( 'page' ) ) );
		$per_page = absint( $request->get_param( 'per_page' ) );
		$per_page = $per_page > 0 ? min( 100, $per_page ) : 50;
		$search   = sanitize_text_field( (string) $request->get_param( 'search' ) );

		$post_types = get_post_types(
			array(
				'public'             => true,
				'publicly_queryable' => true,
			),
			'names'
		);
		unset( $post_types['attachment'] );
		$post_types = array_values( $post_types );
		$post_types = array_merge( array( 'post', 'page' ), $post_types );
		$post_types = array_values( array_unique( $post_types ) );

		$query = new WP_Query(
			array(
				'post_type'      => $post_types,
				'post_status'    => array( 'publish', 'private' ),
				'posts_per_page' => $per_page,
				'paged'          => $page,
				's'              => $search,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'fields'         => 'ids',
			)
		);

		$items = array();
		foreach ( $query->posts as $post_id ) {
			$post = get_post( $post_id );
			if ( ! $post ) {
				continue;
			}

			$items[] = array(
				'id'       => (int) $post_id,
				'type'     => sanitize_text_field( $post->post_type ),
				'title'    => sanitize_text_field( $post->post_title ),
				'editLink' => esc_url_raw( get_edit_post_link( $post_id, '' ) ),
				'viewLink' => esc_url_raw( $this->get_unique_canonical_view_link( $post ) ),
				'rule'     => $this->get_unique_canonical_rule_for_post( $post_id ),
			);
		}

		$response = array(
			'items'   => $items,
			'page'    => $page,
			'perPage' => $per_page,
			'total'   => (int) $query->found_posts,
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Get unique canonical rule.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_unique_canonical_rule( $request ) {
		$post = $this->get_unique_canonical_post( $request );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$response = array(
			'rule' => $this->get_unique_canonical_rule_for_post( $post->ID ),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Update unique canonical rule.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_unique_canonical_rule( $request ) {
		$post = $this->get_unique_canonical_post( $request );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$base_url = $request->get_param( 'baseUrl' );
		$base_url = forge_admin_suite_validate_base_url( $base_url );

		if ( is_wp_error( $base_url ) ) {
			return $base_url;
		}

		$preserve_raw = $request->get_param( 'preserveDefaultPath' );
		$preserve_raw = null === $preserve_raw ? true : rest_sanitize_boolean( $preserve_raw );
		$preserve     = (bool) $preserve_raw;

		if ( '' === $base_url ) {
			delete_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_BASE_URL_META );
			delete_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_PRESERVE_PATH_META );

			return rest_ensure_response(
				array(
					'rule' => null,
				)
			);
		}

		update_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_BASE_URL_META, $base_url );
		update_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_PRESERVE_PATH_META, $preserve ? '1' : '0' );

		$response = array(
			'rule' => array(
				'baseUrl'             => $base_url,
				'preserveDefaultPath' => $preserve,
			),
		);

		return rest_ensure_response( $response );
	}

	/**
	 * Delete unique canonical rule.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_unique_canonical_rule( $request ) {
		$post = $this->get_unique_canonical_post( $request );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		delete_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_BASE_URL_META );
		delete_post_meta( $post->ID, Forge_Admin_Suite_Settings::UNIQUE_CANONICAL_PRESERVE_PATH_META );

		return rest_ensure_response(
			array(
				'rule' => null,
			)
		);
	}

	/**
	 * Resolve unique canonical post from request.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_Post|WP_Error
	 */
	private function get_unique_canonical_post( $request ) {
		$post_id = absint( $request->get_param( 'id' ) );
		if ( $post_id <= 0 ) {
			return new WP_Error(
				'forge_admin_suite_invalid_post',
				__( 'Invalid post ID.', 'forge-admin-suite' ),
				array( 'status' => 404 )
			);
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error(
				'forge_admin_suite_post_not_found',
				__( 'Post not found.', 'forge-admin-suite' ),
				array( 'status' => 404 )
			);
		}

		if ( ! $this->is_unique_canonical_post_type( $post->post_type ) ) {
			return new WP_Error(
				'forge_admin_suite_invalid_post_type',
				__( 'Post type is not supported.', 'forge-admin-suite' ),
				array( 'status' => 400 )
			);
		}

		return $post;
	}

	/**
	 * Check whether a post type supports unique canonical rules.
	 *
	 * @param string $post_type Post type.
	 * @return bool
	 */
	private function is_unique_canonical_post_type( $post_type ) {
		if ( 'attachment' === $post_type ) {
			return false;
		}

		$object = get_post_type_object( $post_type );
		if ( ! $object || ! $object->public || ! $object->publicly_queryable ) {
			return false;
		}

		return true;
	}

	/**
	 * Get a unique canonical rule for a post.
	 *
	 * @param int $post_id Post ID.
	 * @return array|null
	 */
	private function get_unique_canonical_rule_for_post( $post_id ) {
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
	 * Get view link for unique canonical entity.
	 *
	 * @param WP_Post $post Post object.
	 * @return string
	 */
	private function get_unique_canonical_view_link( $post ) {
		if ( 'publish' !== $post->post_status ) {
			return '';
		}

		if ( ! $this->is_unique_canonical_post_type( $post->post_type ) ) {
			return '';
		}

		$link = get_permalink( $post );
		return is_string( $link ) ? $link : '';
	}
}
