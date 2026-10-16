import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import styles from '@node-core/ui-components/Common/Search/Modal/index.module.css';
import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';

/**
 * A large search bar for the landing page.
 *
 * It opens the navbar's search modal rather than mounting a second one: both
 * would claim Cmd/Ctrl+K and open stacked. Registered as an island (see
 * `components` in doc-kit.config.mjs) so the click handler hydrates.
 */
const HeroSearch = () => (
  <div style={{ maxWidth: '36rem', margin: '0 auto 2rem' }}>
    <button
      type="button"
      className={styles.searchButton}
      onClick={event =>
        [...document.querySelectorAll('button[class*="searchButton"]')]
          .find(button => button !== event.currentTarget)
          ?.click()
      }
    >
      <div className={styles.searchButtonContent}>
        <MagnifyingGlassIcon />
        Search the guides...
      </div>
      <span className={styles.searchButtonShortcut}>⌘ K</span>
    </button>
  </div>
);

export default withIsland(HeroSearch, {
  name: 'HeroSearch',
  on: { idle: true },
});
