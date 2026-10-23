import {
  ArrowDownIcon,
  ArrowTurnDownLeftIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/solid';
import SearchModal from '@node-core/ui-components/Common/Search/Modal';
import SearchResults from '@node-core/ui-components/Common/Search/Results';
import SearchHit from '@node-core/ui-components/Common/Search/Results/Hit';
import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { relativeOrAbsolute } from '@doc-kit/generator-react/html/ui/utils/relativeOrAbsolute.mjs';
import { renderLabel } from '@doc-kit/generator-react/html/ui/utils/renderLabel.jsx';
import styles from '@doc-kit/generator-react/html/ui/components/SearchBox/index.module.css';
import { useEffect, useState } from 'react';

import { createOramaClient } from '../../search/oramaClient.mjs';

// Duplicated from doc-kit's SearchBox
// (@doc-kit/generator-react/html/ui/components/SearchBox): same modal, results
// and footer. Only the client differs, and SearchBox gives no way to swap it.
// Compare against that file when upgrading doc-kit.

/**
 * Dismisses the search modal the clicked hit sits in, then follows the link.
 * Escape is the only dismissal `SearchModal` exposes to the hits it renders.
 *
 * @param {MouseEvent} event
 */
const followSearchHit = event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  const { href } = event.currentTarget;

  event.preventDefault();
  event.currentTarget.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );

  // The nested `requestAnimationFrame` waits for the modal to actually close:
  // navigating while it is open suppresses the fragment scroll.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.location.href = href;
    })
  );
};

const SearchHitLink = props => <a {...props} onClick={followSearchHit} />;

/**
 * The page data is fetched on the first search, as doc-kit does for its index.
 *
 * @param {string} pathname The current page's path.
 */
const useSearchClient = pathname => {
  const [client, setClient] = useState(null);

  useEffect(() => {
    const url = relativeOrAbsolute('/search-pages.json', pathname);

    setClient(
      createOramaClient(async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Could not load ${url}: ${response.status}`);
        }
        return response.json();
      })
    );
  }, [pathname]);

  return client;
};

const Search = ({ pathname }) => {
  const client = useSearchClient(pathname);

  return (
    <SearchModal client={client} placeholder="Start typing...">
      <div className={styles.searchResultsContainer}>
        <SearchResults
          noResultsTitle="No results found for"
          onHit={hit => (
            <SearchHit
              as={SearchHitLink}
              document={{
                ...hit.document,
                description: renderLabel(hit.document.description),
                href: relativeOrAbsolute(hit.document.href, pathname),
              }}
            />
          )}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.shortcutWrapper}>
          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>
              <ArrowTurnDownLeftIcon />
            </kbd>
            <span className={styles.shortcutLabel}>to select</span>
          </div>

          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>
              <ArrowDownIcon />
            </kbd>
            <kbd className={styles.shortcutKey}>
              <ArrowUpIcon />
            </kbd>
            <span className={styles.shortcutLabel}>to navigate</span>
          </div>

          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>esc</kbd>
            <span className={styles.shortcutLabel}>to close</span>
          </div>
        </div>
      </div>
    </SearchModal>
  );
};

export default withIsland(Search, { name: 'LearnSearch', on: { idle: true } });
