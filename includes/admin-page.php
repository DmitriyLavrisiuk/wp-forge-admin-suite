<?php
/**
 * Admin page renderer.
 *
 * @package ForgeAdminSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin page renderer.
 */
final class Forge_Admin_Suite_Admin_Page {
	/**
	 * Render admin page.
	 *
	 * @return void
	 */
	public function render() {
		?>
		<div class="wrap">
			<span class="screen-reader-text"><?php echo esc_html__( 'Универсальная Админ Панель', 'forge-admin-suite' ); ?></span>
			<div id="forge-admin-suite-root"></div>
		</div>
		<?php
	}
}
