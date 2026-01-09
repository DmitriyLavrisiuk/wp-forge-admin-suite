<?php
/**
 * Plugin uninstall handler.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$transient_key = 'forge_admin_suite_vite_origin';

delete_transient( $transient_key );
delete_site_transient( $transient_key );
