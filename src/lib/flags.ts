/**
 * Build-time feature flags. A flag hides a finished feature from users without
 * deleting it: everything behind one stays compiled and tested, so flipping the
 * constant back to `true` is the whole restore.
 */

/**
 * The right-hand "Supporting Context" tray (`RightTray`), its top-bar toggle and
 * its `]` shortcut. Off for now: the context items behind it are not ready to
 * show. `rightOpen` in the UI store is untouched, so a presenter's stored panel
 * state survives the flag being flipped back on.
 */
export const RIGHT_TRAY_ENABLED = false;

/**
 * Layers hidden from the nav. A hidden layer keeps its content, its components
 * and its route: `/background` still renders for anyone holding the link, so a
 * section can be shown to one person without being part of the walk-through.
 * It just stops appearing in the left nav, the icon rail, the Back/Next paging
 * and search results.
 *
 * `background` ("Foundational Background") is out for now: it is not ready to
 * put in front of readers. Empty this array to bring it back.
 */
export const HIDDEN_LAYER_IDS: readonly string[] = ['background'];

/**
 * Click-through on the Our Holdings "Examples" cards: the service offerings
 * and the products. Off for now: those cards ship ahead of their focus
 * content, so they look exactly as they always did and simply do not open.
 * The sector summaries and the companies are unaffected, on the Overview and
 * in the band headers alike, and the focus views themselves still render for
 * anyone holding the link. Flip this back to `true` once the offerings and the
 * products have their copy.
 */
export const HOLDINGS_EXAMPLES_CLICKABLE = false;
